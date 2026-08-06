package com.salecrm.performance.dto;

import java.util.List;
import java.util.Map;

public record RegionPerformanceRow(
        Long regionId,
        String regionName,
        int totalActual,
        int totalUniquePhones,
        Map<String, BucketActual> buckets,
        List<TownshipPerformanceRow> townships
) {
}
