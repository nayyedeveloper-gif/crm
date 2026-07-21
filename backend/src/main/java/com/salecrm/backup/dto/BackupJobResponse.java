package com.salecrm.backup.dto;

import java.time.Instant;

public record BackupJobResponse(
        Long id,
        String jobType,
        String status,
        String filename,
        Long sizeBytes,
        Integer recordCount,
        String errorMessage,
        String triggeredBy,
        Instant createdAt,
        String destinationType,
        String destinationPath
) {
}
