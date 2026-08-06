package com.salecrm.crmhistory.dto;

public record CrmHistoryAmountSummary(
        long total,
        long amount50To100,
        long amount100To300,
        long amount300To500,
        long amount500To1000,
        long amountAbove1000,
        long amountOther
) {
}
