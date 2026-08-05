package com.salecrm.order.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ShopOrderResponse(
        Long id,
        String orderCode,
        String customerName,
        String phone,
        String address,
        String note,
        String itemsJson,
        BigDecimal totalAmount,
        String status,
        String trackingNumber,
        String paymentMethod,
        String paymentRef,
        String paymentStatus,
        String telegramChatId,
        Instant createdAt,
        Instant updatedAt
) {
}
