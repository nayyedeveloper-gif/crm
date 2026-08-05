package com.salecrm.showcase.dto;

/** Projection for batch cover / count loading without initializing lazy parents. */
public record ShowcaseImageRow(Long itemId, Long imageId, int sortOrder) {}
