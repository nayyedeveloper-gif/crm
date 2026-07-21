package com.salecrm.performance.dto;

import java.util.List;
import java.util.Map;

public record RegionPerformanceRow(
        Long regionId,
        String regionName,
        int totalActual,
        Map<String, Integer> buckets,
        List<TownshipPerformanceRow> townships
) {
}
