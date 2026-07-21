package com.salecrm.product.dto;

import java.math.BigDecimal;

/** Lightweight card for the public Gems & Jewellery catalog. */
public record PublicProductSummary(
        String publicCode,
        String productCode,
        String name,
        String category,
        BigDecimal price,
        BigDecimal compareAtPrice,
        boolean featured,
        boolean specialOffer,
        java.time.Instant offerEndsAt,
        String offerHeadline,
        String metalPurity,
        String imageUrl,
        String offerImageUrl,
        java.time.Instant updatedAt
) {
}
