package com.salecrm.sales.dto;

import java.time.Instant;
import java.time.LocalDate;

public record SalesStatusResponse(
        long transactionCount,
        LocalDate latestSaleDate,
        Instant lastUpdated
) {
}
