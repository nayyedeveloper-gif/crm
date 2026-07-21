package com.salecrm.inquiry.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record ShopInquiryRequest(
        @NotBlank @Size(max = 160) String customerName,
        @NotBlank @Size(max = 40) String phone,
        @Size(max = 2000) String note,
        @NotEmpty @Valid List<Item> items
) {
    public record Item(
            @NotBlank @Size(max = 32) String publicCode,
            @Size(max = 80) String productCode,
            @Size(max = 200) String name,
            @Size(max = 100) String category,
            BigDecimal price,
            Integer qty
    ) {
    }
}
