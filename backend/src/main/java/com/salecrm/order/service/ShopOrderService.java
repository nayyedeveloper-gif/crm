package com.salecrm.order.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.order.dto.ShopOrderCreateRequest;
import com.salecrm.order.dto.ShopOrderResponse;
import com.salecrm.order.entity.ShopOrder;
import com.salecrm.order.repository.ShopOrderRepository;
import com.salecrm.settings.entity.AppSettings;
import com.salecrm.settings.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ShopOrderService {

    public static final Set<String> STATUSES = Set.of(
            "PENDING_PAYMENT",
            "AWAITING_CONFIRMATION",
            "CONFIRMED",
            "PACKING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED"
    );

    private final ShopOrderRepository orderRepository;
    private final AppSettingsRepository appSettingsRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    @Transactional
    public ShopOrderResponse create(ShopOrderCreateRequest request) {
        AppSettings settings = requireSettings();
        if (!settings.isShopCheckoutEnabled()) {
            throw new BusinessException("Checkout is disabled");
        }

        String itemsJson;
        try {
            itemsJson = objectMapper.writeValueAsString(request.items());
        } catch (JsonProcessingException e) {
            throw new BusinessException("Invalid order items");
        }

        BigDecimal total = request.items().stream()
                .map(i -> {
                    BigDecimal price = i.price() != null ? i.price() : BigDecimal.ZERO;
                    int qty = i.qty() != null && i.qty() > 0 ? i.qty() : 1;
                    return price.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        boolean mmqr = settings.isShopMmqrEnabled();
        String status = mmqr ? "PENDING_PAYMENT" : "AWAITING_CONFIRMATION";
        if (mmqr && StringUtils.hasText(request.paymentRef())) {
            status = "AWAITING_CONFIRMATION";
        }

        ShopOrder order = ShopOrder.builder()
                .orderCode(generateOrderCode())
                .customerName(request.customerName().trim())
                .phone(request.phone().trim())
                .address(trimOrNull(request.address()))
                .note(trimOrNull(request.note()))
                .itemsJson(itemsJson)
                .totalAmount(total.compareTo(BigDecimal.ZERO) > 0 ? total : null)
                .status(status)
                .paymentMethod(mmqr ? "MMQR" : "MANUAL")
                .paymentRef(trimOrNull(request.paymentRef()))
                .build();

        ShopOrder saved = orderRepository.save(order);
        auditLogService.change("SHOP_ORDERS", "CREATE",
                "Order " + saved.getOrderCode() + " from " + saved.getCustomerName(),
                "status=" + saved.getStatus());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ShopOrderResponse track(String orderCode, String phone) {
        AppSettings settings = requireSettings();
        if (!settings.isShopOrdersEnabled()) {
            throw new BusinessException("Order tracking is disabled");
        }
        if (!StringUtils.hasText(orderCode) || !StringUtils.hasText(phone)) {
            throw new BusinessException("Order code and phone are required");
        }
        ShopOrder order = orderRepository
                .findByOrderCodeIgnoreCaseAndPhone(orderCode.trim(), phone.trim())
                .orElseThrow(() -> new BusinessException("Order not found"));
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<ShopOrderResponse> listAll() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countByStatus(String status) {
        return orderRepository.countByStatus(status.trim().toUpperCase(Locale.ROOT));
    }

    @Transactional
    public ShopOrderResponse updateStatus(Long id, String status, String trackingNumber) {
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw new BusinessException("Invalid order status");
        }
        ShopOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopOrder", id));
        order.setStatus(normalized);
        if (trackingNumber != null) {
            order.setTrackingNumber(trimOrNull(trackingNumber));
        }
        ShopOrder saved = orderRepository.save(order);
        auditLogService.change("SHOP_ORDERS", "STATUS",
                "Order " + saved.getOrderCode() + " → " + normalized, saved.getTrackingNumber());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ShopOrderResponse getById(Long id) {
        ShopOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopOrder", id));
        return toResponse(order);
    }

    @Transactional
    public void delete(Long id) {
        ShopOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopOrder", id));
        String code = order.getOrderCode();
        orderRepository.delete(order);
        auditLogService.change("SHOP_ORDERS", "DELETE",
                "Order " + code + " deleted", null);
    }

    private String generateOrderCode() {
        for (int i = 0; i < 8; i++) {
            String code = "ORD-" + UUID.randomUUID().toString().replace("-", "")
                    .substring(0, 8).toUpperCase(Locale.ROOT);
            if (!orderRepository.existsByOrderCode(code)) {
                return code;
            }
        }
        throw new BusinessException("Could not allocate order code");
    }

    private AppSettings requireSettings() {
        return appSettingsRepository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("AppSettings", 1));
    }

    private ShopOrderResponse toResponse(ShopOrder o) {
        return new ShopOrderResponse(
                o.getId(),
                o.getOrderCode(),
                o.getCustomerName(),
                o.getPhone(),
                o.getAddress(),
                o.getNote(),
                o.getItemsJson(),
                o.getTotalAmount(),
                o.getStatus(),
                o.getTrackingNumber(),
                o.getPaymentMethod(),
                o.getPaymentRef(),
                o.getCreatedAt(),
                o.getUpdatedAt()
        );
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
