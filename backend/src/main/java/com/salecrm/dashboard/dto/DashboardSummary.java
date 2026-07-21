package com.salecrm.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummary(
        long totalRecords,
        BigDecimal totalAmount,
        long recordsToday,
        long recordsThisMonth,
        List<NamedCount> byActionType,
        List<NamedCount> byBranch,
        List<NamedCount> byRegion,
        List<NamedCount> byTownship
) {
}
