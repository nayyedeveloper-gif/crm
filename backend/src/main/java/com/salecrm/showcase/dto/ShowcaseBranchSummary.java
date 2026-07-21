package com.salecrm.showcase.dto;

public record ShowcaseBranchSummary(
        Long branchId,
        String branchCode,
        String branchName,
        long itemCount
) {
}
