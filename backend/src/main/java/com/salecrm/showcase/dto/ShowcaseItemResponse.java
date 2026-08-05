package com.salecrm.showcase.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ShowcaseItemResponse(
        Long id,
        Long branchId,
        String branchCode,
        String branchName,
        String itemCode,
        String name,
        Long categoryId,
        String category,
        Long subcategoryId,
        String subCategory,
        String description,
        BigDecimal priceMmk,
        String metalPurity,
        BigDecimal weightGram,
        BigDecimal stoneCarat,
        boolean active,
        /** Total photos; list may only include the cover in {@code images}. */
        int imageCount,
        List<ShowcaseImageResponse> images,
        Instant createdAt,
        Instant updatedAt
) {
}
