package com.salecrm.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductCategoryRequest(
        @NotBlank @Size(max = 100) String name,
        Integer sortOrder,
        Boolean active
) {
}
