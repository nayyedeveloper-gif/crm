package com.salecrm.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record ShopOrderCreateRequest(
        @NotBlank @Size(max = 160) String customerName,
        @NotBlank @Size(max = 40) String phone,
        @Size(max = 1000) String address,
        @Size(max = 1000) String note,
        @Size(max = 160) String paymentRef,
        /** Optional Telegram chat id when the order is placed via the bot. */
        @Size(max = 64) String telegramChatId,
        @NotEmpty @Valid List<ShopOrderItemRequest> items
) {
    public record ShopOrderItemRequest(
            @NotBlank String publicCode,
            String productCode,
            @NotBlank String name,
            String category,
            BigDecimal price,
            BigDecimal compareAtPrice,
            Integer qty
    ) {
    }
}
