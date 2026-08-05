package com.salecrm.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShopOrderStatusRequest(
        @NotBlank @Size(max = 40) String status,
        @Size(max = 120) String trackingNumber,
        /** Optional: UNPAID | PAID | REFUNDED — admin sets manually until MMQR. */
        @Size(max = 20) String paymentStatus
) {
}
