package com.salecrm.log.dto;

import java.time.Instant;

public record SystemLogResponse(
        Long id,
        String level,
        String source,
        String message,
        String detail,
        Instant createdAt
) {
}
