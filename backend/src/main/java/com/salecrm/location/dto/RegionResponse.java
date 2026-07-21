package com.salecrm.location.dto;

public record RegionResponse(
        Long id,
        String code,
        String nameMm,
        String nameEn,
        int sortOrder
) {
}
