package com.salecrm.showcase.dto;

import java.util.List;

public record ShowcaseSummaryResponse(
        long totalItems,
        List<ShowcaseBranchSummary> branches
) {
}
