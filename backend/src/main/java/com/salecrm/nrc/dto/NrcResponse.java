package com.salecrm.nrc.dto;

public record NrcResponse(
        Long id,
        String nameEn,
        String nameMm,
        int nrcCode,
        int sortOrder
) {
}
