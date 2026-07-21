package com.salecrm.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShopInquiryStatusRequest(
        @NotBlank @Size(max = 20) String status
) {
}
