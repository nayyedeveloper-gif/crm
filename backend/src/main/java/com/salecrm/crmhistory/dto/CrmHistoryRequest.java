package com.salecrm.crmhistory.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.InviteStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CrmHistoryRequest(
        @JsonAlias("branch_id")
        Long branchId,

        @JsonAlias("customer_name")
        @NotBlank(message = "Customer name is required")
        @Size(max = 160, message = "Customer name must not exceed 160 characters")
        String customerName,

        @JsonAlias("phone_number")
        @NotBlank(message = "Phone is required")
        @Size(max = 40, message = "Phone must not exceed 40 characters")
        String phone,

        @JsonAlias("date_of_birth")
        LocalDate birthday,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0", message = "Amount must be non-negative")
        BigDecimal amount,

        @JsonAlias("action_type")
        ActionType actionType,

        @JsonAlias("invite_status")
        InviteStatus inviteStatus,

        @JsonAlias("customer_condition")
        @Size(max = 120)
        String customerCondition,

        @JsonAlias("region_id")
        Long regionId,

        @JsonAlias("township_id")
        Long townshipId,

        @Size(max = 30, message = "NRC must not exceed 30 characters")
        String nrc,

        @Size(max = 400, message = "Address must not exceed 400 characters")
        String address,

        @Size(max = 1000, message = "Remark must not exceed 1000 characters")
        String remark
) {
}
