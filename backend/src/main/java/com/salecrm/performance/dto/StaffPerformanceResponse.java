package com.salecrm.performance.dto;

import java.util.List;

public record StaffPerformanceResponse(
        List<BucketMeta> bucketMeta,
        List<StaffPerformanceRow> rows,
        StaffPerformanceRow totals
) {
}
