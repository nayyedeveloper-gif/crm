package com.salecrm.performance.dto;

import java.util.List;

public record StatusBreakdownResponse(
        List<BucketMeta> bucketMeta,
        List<StatusBreakdownRow> rows,
        StatusBreakdownRow totals
) {
}
