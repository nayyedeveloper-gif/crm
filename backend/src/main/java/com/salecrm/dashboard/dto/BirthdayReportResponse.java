package com.salecrm.dashboard.dto;

import java.util.List;
import java.util.Map;

public record BirthdayReportResponse(
        Map<String, Long> tierCounts,
        long totalBirthdays,
        List<BirthdayWeekCard> weeks,
        List<BirthdayRegionCard> regions,
        List<CrmCustomerRow> birthdayToday
) {
}
