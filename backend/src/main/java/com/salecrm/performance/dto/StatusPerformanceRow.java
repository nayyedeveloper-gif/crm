package com.salecrm.performance.dto;

import java.util.Map;

public record StatusPerformanceRow(
        String staffKey,
        int total,
        Map<String, Integer> statuses
) {
}
