package com.salecrm.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record ReportSummary(
        long totalRecords,
        BigDecimal totalAmount,
        List<NamedCount> byActionType,
        List<NamedCount> byBranch,
        List<NamedCount> byRegion,
        List<NamedCount> byTownship,
        List<NamedCount> byStaff
) {
}
