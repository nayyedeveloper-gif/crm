package com.salecrm.sales.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalesTransactionCreateRequest(
        LocalDate saleDate,
        String branchName,
        String reason,
        String salesStaff,
        String buyerName,
        String contactNumber,
        String township,
        String region,
        String customerType,
        BigDecimal qty,
        BigDecimal gram,
        BigDecimal amount,
        String itemCategory,
        String itemMainGroup,
        String itemsCode,
        String purity,
        String specialEvent
) {
}
