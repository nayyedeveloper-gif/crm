package com.salecrm.inquiry.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.inquiry.dto.ShopInquiryRequest;
import com.salecrm.inquiry.dto.ShopInquiryResponse;
import com.salecrm.inquiry.entity.ShopInquiry;
import com.salecrm.inquiry.repository.ShopInquiryRepository;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.webhook.service.N8nWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ShopInquiryService {

    private static final Set<String> STATUSES = Set.of("NEW", "CONTACTED", "CLOSED");

    private final ShopInquiryRepository inquiryRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;
    private final N8nWebhookService n8nWebhookService;

    @Transactional
    public ShopInquiryResponse submit(ShopInquiryRequest request) {
        if (request.items().isEmpty()) {
            throw new BusinessException("Inquiry must include at least one item");
        }
        String itemsJson;
        try {
            itemsJson = objectMapper.writeValueAsString(request.items());
        } catch (JsonProcessingException e) {
            throw new BusinessException("Invalid inquiry items");
        }

        ShopInquiry inquiry = ShopInquiry.builder()
                .customerName(request.customerName().trim())
                .phone(request.phone().trim())
                .note(StringUtils.hasText(request.note()) ? request.note().trim() : null)
                .itemsJson(itemsJson)
                .status("NEW")
                .build();
        ShopInquiry saved = inquiryRepository.save(inquiry);
        auditLogService.change("SHOP_INQUIRIES", "CREATE",
                "Inquiry from " + saved.getCustomerName() + " / " + saved.getPhone(),
                "items=" + request.items().size());
        ShopInquiryResponse response = toResponse(saved);
        n8nWebhookService.dispatch("inquiry.created", response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<ShopInquiryResponse> listAll() {
        return inquiryRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countByStatus(String status) {
        return inquiryRepository.countByStatus(status.trim().toUpperCase(Locale.ROOT));
    }

    @Transactional
    public ShopInquiryResponse updateStatus(Long id, String status) {
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw new BusinessException("Invalid status. Use NEW, CONTACTED, or CLOSED");
        }
        ShopInquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopInquiry", id));
        inquiry.setStatus(normalized);
        ShopInquiry saved = inquiryRepository.save(inquiry);
        auditLogService.change("SHOP_INQUIRIES", "STATUS",
                "Inquiry #" + id + " → " + normalized, null);
        ShopInquiryResponse response = toResponse(saved);
        n8nWebhookService.dispatch("inquiry.status", response);
        return response;
    }

    @Transactional
    public void delete(Long id) {
        ShopInquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopInquiry", id));
        String summary = inquiry.getCustomerName() + " / " + inquiry.getPhone();
        inquiryRepository.delete(inquiry);
        auditLogService.change("SHOP_INQUIRIES", "DELETE",
                "Inquiry #" + id + " deleted · " + summary, null);
    }

    private ShopInquiryResponse toResponse(ShopInquiry i) {
        return new ShopInquiryResponse(
                i.getId(),
                i.getCustomerName(),
                i.getPhone(),
                i.getNote(),
                i.getItemsJson(),
                i.getStatus(),
                i.getCreatedAt(),
                i.getUpdatedAt()
        );
    }
}
