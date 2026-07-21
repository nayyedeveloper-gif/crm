package com.salecrm.backup.dto;

import java.time.Instant;
import java.time.LocalTime;

public record BackupSettingsResponse(
        boolean autoEnabled,
        String frequency,
        LocalTime timeOfDay,
        int retainDays,
        Instant lastAutoRunAt,
        String destinationType,
        String destinationPath,
        String driveFolderId
) {
}
