package com.salecrm.performance.dto;

import java.util.List;

public record StatusPerformanceResponse(
        List<String> statusCodes,
        List<StatusPerformanceRow> rows,
        StatusPerformanceRow totals
) {
}
