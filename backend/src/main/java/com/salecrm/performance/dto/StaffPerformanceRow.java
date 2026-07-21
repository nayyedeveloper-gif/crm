package com.salecrm.performance.dto;

import java.util.Map;

public record StaffPerformanceRow(
        String staffKey,
        int totalTarget,
        int totalActual,
        Map<String, BucketCounts> buckets
) {
}
