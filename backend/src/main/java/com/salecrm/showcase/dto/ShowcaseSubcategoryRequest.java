package com.salecrm.showcase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ShowcaseSubcategoryRequest(
        @NotNull Long categoryId,
        @NotBlank @Size(max = 100) String name,
        Integer sortOrder,
        Boolean active
) {
}
