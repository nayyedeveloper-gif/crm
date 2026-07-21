package com.salecrm.product.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

public record ProductResponse(
        Long id,
        String productCode,
        String name,
        Long categoryId,
        String category,
        String description,
        BigDecimal price,
        BigDecimal compareAtPrice,
        boolean featured,
        boolean specialOffer,
        java.time.Instant offerEndsAt,
        String offerHeadline,
        String metalPurity,
        BigDecimal weightGram,
        BigDecimal stoneCarat,
        String publicCode,
        String publicUrl,
        Map<String, String> images,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
