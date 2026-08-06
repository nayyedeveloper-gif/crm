package com.salecrm.legacy.dto;

import java.util.List;

public record LegacyHealthResponse(
        boolean connected,
        String database,
        String urlHost,
        List<LegacyTableInfo> tables
) {
}
