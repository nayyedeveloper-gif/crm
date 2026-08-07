package com.salecrm.dashboard.dto;

import com.salecrm.dashboard.CustomerTier;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record CrmCustomerRow(
        String phone,
        String customerName,
        CustomerTier tier,
        LocalDate birthday,
        Integer age,
        String branchName,
        Long branchId,
        String regionName,
        Long regionId,
        String townshipName,
        Long townshipId,
        String address,
        String createdBy,
        BigDecimal totalAmount,
        long visits,
        Instant lastUpdate
) {
}
