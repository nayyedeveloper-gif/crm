package com.salecrm.sales.dto;

public record SalesImportResult(
        int imported,
        int skipped,
        String message
) {
}
