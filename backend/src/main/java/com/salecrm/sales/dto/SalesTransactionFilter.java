package com.salecrm.sales.dto;

import java.time.LocalDate;
import java.util.List;

public record SalesTransactionFilter(
        LocalDate from,
        LocalDate to,
        List<String> branchNames
) {
}
