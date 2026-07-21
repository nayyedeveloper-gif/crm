package com.salecrm.backup.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record BackupSettingsUpdateRequest(
        @NotNull Boolean autoEnabled,
        @NotBlank String frequency,
        @NotNull LocalTime timeOfDay,
        @NotNull @Min(1) @Max(365) Integer retainDays,
        @NotBlank String destinationType,
        @NotBlank @Size(max = 500) String destinationPath,
        @Size(max = 200) String driveFolderId
) {
}
