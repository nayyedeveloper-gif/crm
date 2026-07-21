package com.salecrm.performance.dto;

import java.util.Map;

public record TownshipPerformanceRow(
        Long townshipId,
        String townshipName,
        int totalActual,
        Map<String, Integer> buckets
) {
}
