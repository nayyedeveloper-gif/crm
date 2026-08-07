package com.salecrm.dashboard.dto;

import java.util.Map;

public record BirthdayRegionCard(
        Long regionId,
        String regionName,
        long totalCustomers,
        Map<String, Long> tierCounts,
        Map<String, Long> ageCounts
) {
}
