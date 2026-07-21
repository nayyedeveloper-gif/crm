package com.salecrm.showcase.dto;

public record ShowcaseSubcategoryResponse(
        Long id,
        Long categoryId,
        String categoryName,
        String name,
        int sortOrder,
        boolean active,
        long itemCount
) {
}
