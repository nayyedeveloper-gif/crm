package com.salecrm.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record CrmCustomerListResponse(
        Map<String, Long> tierCounts,
        long totalCustomers,
        BigDecimal totalPurchase,
        long totalVisits,
        BigDecimal avgPerCustomer,
        List<CrmCustomerRow> customers
) {
}
