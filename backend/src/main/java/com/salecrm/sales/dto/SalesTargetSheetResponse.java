package com.salecrm.sales.dto;

import java.util.Map;

public record SalesTargetSheetResponse(
        String month,
        Map<String, Object> total,
        Map<String, Map<String, Object>> shops
) {
}
