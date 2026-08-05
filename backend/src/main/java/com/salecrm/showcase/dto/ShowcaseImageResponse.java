package com.salecrm.showcase.dto;

public record ShowcaseImageResponse(
        Long id,
        String url,
        String thumbUrl,
        int sortOrder
) {
}
