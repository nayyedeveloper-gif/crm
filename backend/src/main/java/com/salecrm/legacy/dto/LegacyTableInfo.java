package com.salecrm.legacy.dto;

public record LegacyTableInfo(
        String name,
        String description,
        long rowCount
) {
}
