package com.salecrm.media.dto;

public record ThumbBackfillResponse(
        SectionStats showcase,
        SectionStats products
) {
    public record SectionStats(int scanned, int created, int skipped, int failed) {}
}
