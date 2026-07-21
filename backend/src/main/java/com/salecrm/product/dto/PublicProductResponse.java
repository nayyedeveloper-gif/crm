package com.salecrm.product.dto;

import java.math.BigDecimal;
import java.util.Map;

public record PublicProductResponse(
        String publicCode,
        String productCode,
        String name,
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
        Map<String, String> images,
        String appName,
        String shopWhatsapp,
        String shopViber,
        java.time.Instant updatedAt
) {
}
