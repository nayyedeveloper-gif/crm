package com.salecrm.performance.dto;

import java.util.Map;

public record StatusBreakdownRow(
        String statusCode,
        String statusLabel,
        int total,
        int totalUniquePhones,
        Map<String, BucketActual> buckets
) {
}
