package com.salecrm.location.dto;

public record TownshipResponse(
        Long id,
        Long regionId,
        String nameMm,
        String nameEn,
        int sortOrder
) {
}
