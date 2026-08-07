package com.salecrm.dashboard.dto;

import java.util.Map;

public record BirthdayWeekCard(
        int week,
        String label,
        String dayRange,
        long totalCustomers,
        Map<String, Long> tierCounts,
        Map<String, Long> ageCounts
) {
}
