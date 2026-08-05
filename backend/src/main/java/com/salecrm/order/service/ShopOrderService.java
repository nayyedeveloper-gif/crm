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
import com.salecrm.webhook.service.N8nWebhookService;
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

    public static final Set<String> PAYMENT_STATUSES = Set.of(
            "UNPAID",
            "PAID",
            "REFUNDED"
    );

    private static final Set<String> CANCELABLE = Set.of(
            "PENDING_PAYMENT",
            "AWAITING_CONFIRMATION",
            "CONFIRMED",
            "PACKING"
    );

    private final ShopOrderRepository orderRepository;
    private final AppSettingsRepository appSettingsRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;
    private final N8nWebhookService n8nWebhookService;

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
                .phone(normalizePhone(request.phone()))
                .address(trimOrNull(request.address()))
                .note(trimOrNull(request.note()))
                .itemsJson(itemsJson)
                .totalAmount(total.compareTo(BigDecimal.ZERO) > 0 ? total : null)
                .status(status)
                .paymentMethod(mmqr ? "MMQR" : "MANUAL")
                .paymentRef(trimOrNull(request.paymentRef()))
                .paymentStatus("UNPAID")
                .telegramChatId(trimOrNull(request.telegramChatId()))
                .build();

        ShopOrder saved = orderRepository.save(order);
        auditLogService.change("SHOP_ORDERS", "CREATE",
                "Order " + saved.getOrderCode() + " from " + saved.getCustomerName(),
                "status=" + saved.getStatus()
                        + (saved.getTelegramChatId() != null ? " telegram=yes" : ""));
        ShopOrderResponse response = toResponse(saved);
        n8nWebhookService.dispatch("order.created", response);
        return response;
    }

    @Transactional(readOnly = true)
    public ShopOrderResponse track(String orderCode, String phone) {
        AppSettings settings = requireSettings();
        if (!settings.isShopOrdersEnabled()) {
            throw new BusinessException("Order tracking is disabled");
        }
        return toResponse(requireByCodeAndPhone(orderCode, phone));
    }

    @Transactional
    public ShopOrderResponse cancelByCodeAndPhone(String orderCode, String phone, boolean confirm) {
        if (!confirm) {
            throw new BusinessException(
                    "Confirm cancel first. Ask the customer, then call again with confirm=true.");
        }
        ShopOrder order = requireByCodeAndPhone(orderCode, phone);
        if ("CANCELLED".equals(order.getStatus())) {
            return toResponse(order);
        }
        if (!CANCELABLE.contains(order.getStatus())) {
            throw new BusinessException(
                    "Order cannot be cancelled in status " + order.getStatus());
        }
        order.setStatus("CANCELLED");
        ShopOrder saved = orderRepository.save(order);
        auditLogService.change("SHOP_ORDERS", "CANCEL",
                "Order " + saved.getOrderCode() + " cancelled (customer/bot)",
                "phone=" + saved.getPhone());
        ShopOrderResponse response = toResponse(saved);
        // Customer notify listens to order.status (status=CANCELLED); order.cancelled for admin/analytics.
        n8nWebhookService.dispatch("order.status", response);
        n8nWebhookService.dispatch("order.cancelled", response);
        return response;
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
    public ShopOrderResponse updateStatus(Long id, String status, String trackingNumber, String paymentStatus) {
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw new BusinessException("Invalid order status");
        }
        ShopOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopOrder", id));

        String previousStatus = order.getStatus() != null
                ? order.getStatus().toUpperCase(Locale.ROOT)
                : "";
        String previousPayment = order.getPaymentStatus() != null
                ? order.getPaymentStatus().toUpperCase(Locale.ROOT)
                : "UNPAID";
        String previousTracking = order.getTrackingNumber();

        order.setStatus(normalized);
        if (trackingNumber != null) {
            order.setTrackingNumber(trimOrNull(trackingNumber));
        }

        boolean paymentChanged = false;
        boolean paymentBecamePaid = false;
        if (StringUtils.hasText(paymentStatus)) {
            String pay = paymentStatus.trim().toUpperCase(Locale.ROOT);
            if (!PAYMENT_STATUSES.contains(pay)) {
                throw new BusinessException("Invalid payment status");
            }
            paymentChanged = !pay.equals(previousPayment);
            paymentBecamePaid = paymentChanged && "PAID".equals(pay);
            order.setPaymentStatus(pay);
        }

        boolean statusChanged = !normalized.equals(previousStatus);
        boolean trackingChanged = trackingNumber != null
                && !java.util.Objects.equals(trimOrNull(trackingNumber), previousTracking);

        ShopOrder saved = orderRepository.save(order);
        auditLogService.change("SHOP_ORDERS", "STATUS",
                "Order " + saved.getOrderCode() + " → " + normalized
                        + " payment=" + saved.getPaymentStatus(),
                saved.getTrackingNumber());
        ShopOrderResponse response = toResponse(saved);

        if (statusChanged || paymentChanged || trackingChanged) {
            n8nWebhookService.dispatch("order.status", response);
        }
        if (paymentBecamePaid) {
            n8nWebhookService.dispatch("order.payment_paid", response);
        }
        return response;
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

    private ShopOrder requireByCodeAndPhone(String orderCode, String phone) {
        if (!StringUtils.hasText(orderCode) || !StringUtils.hasText(phone)) {
            throw new BusinessException("Order code and phone are required");
        }
        String code = orderCode.trim();
        String phoneNorm = normalizePhone(phone);
        return orderRepository.findByOrderCodeIgnoreCase(code)
                .filter(o -> normalizePhone(o.getPhone()).equals(phoneNorm))
                .orElseThrow(() -> new BusinessException("Order not found"));
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
                o.getPaymentStatus() != null ? o.getPaymentStatus() : "UNPAID",
                o.getTelegramChatId(),
                o.getCreatedAt(),
                o.getUpdatedAt()
        );
    }

    /** Digits-only compare friendly: keep leading + if present, strip spaces/dashes. */
    static String normalizePhone(String phone) {
        String raw = phone.trim().replace(" ", "").replace("-", "");
        if (raw.startsWith("+")) {
            return "+" + raw.substring(1).replaceAll("\\D", "");
        }
        return raw.replaceAll("\\D", "");
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
