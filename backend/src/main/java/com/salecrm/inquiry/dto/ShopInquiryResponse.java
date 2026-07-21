package com.salecrm.inquiry.dto;

import java.time.Instant;

public record ShopInquiryResponse(
        Long id,
        String customerName,
        String phone,
        String note,
        String itemsJson,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
