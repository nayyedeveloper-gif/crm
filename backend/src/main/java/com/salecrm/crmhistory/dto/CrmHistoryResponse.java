package com.salecrm.crmhistory.dto;

import com.salecrm.crmhistory.entity.ActionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record CrmHistoryResponse(
        Long id,
        Long version,
        Long branchId,
        String branchName,
        String customerName,
        String phone,
        LocalDate birthday,
        BigDecimal amount,
        ActionType actionType,
        Long regionId,
        String regionName,
        Long townshipId,
        String townshipName,
        String nrc,
        String address,
        String remark,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        String updatedBy
) {
}
