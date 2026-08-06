package com.salecrm.legacy.dto;

public record LegacyCrmImportResult(
        long legacyCrmCount,
        long importedOrUpdated,
        long skipped,
        long targetsImported,
        long interactionsImported,
        boolean clearedPreviousLegacy,
        String message
) {
}
