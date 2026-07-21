package com.salecrm.product.dto;

public record ProductCategoryResponse(
        Long id,
        String name,
        int sortOrder,
        boolean active,
        long productCount
) {
}
