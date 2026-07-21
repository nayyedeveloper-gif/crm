package com.salecrm.log.dto;

import java.time.Instant;

public record ChangeLogResponse(
        Long id,
        String category,
        String action,
        String summary,
        String detail,
        String actor,
        Instant createdAt
) {
}
