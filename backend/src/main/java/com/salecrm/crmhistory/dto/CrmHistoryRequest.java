package com.salecrm.crmhistory.dto;

import com.salecrm.crmhistory.entity.ActionType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CrmHistoryRequest(
        Long branchId,

        @NotBlank(message = "Customer name is required")
        @Size(max = 160, message = "Customer name must not exceed 160 characters")
        String customerName,

        @NotBlank(message = "Phone is required")
        @Size(max = 40, message = "Phone must not exceed 40 characters")
        String phone,

        LocalDate birthday,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0", message = "Amount must be non-negative")
        BigDecimal amount,

        ActionType actionType,

        @NotNull(message = "Region is required")
        Long regionId,

        Long townshipId,

        @Size(max = 30, message = "NRC must not exceed 30 characters")
        String nrc,

        @Size(max = 400, message = "Address must not exceed 400 characters")
        String address,

        @Size(max = 1000, message = "Remark must not exceed 1000 characters")
        String remark
) {
}
