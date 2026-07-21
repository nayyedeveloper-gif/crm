package com.salecrm.performance.dto;

import java.util.List;

public record RegionPerformanceResponse(
        List<BucketMeta> bucketMeta,
        List<RegionPerformanceRow> rows,
        RegionPerformanceRow totals
) {
}
