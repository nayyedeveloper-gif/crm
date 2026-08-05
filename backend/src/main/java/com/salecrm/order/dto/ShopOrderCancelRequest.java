package com.salecrm.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShopOrderCancelRequest(
        @NotBlank @Size(max = 32) String code,
        @NotBlank @Size(max = 40) String phone,
        /** Must be true — bot should ask the customer first, then call with confirm=true. */
        boolean confirm
) {
}
