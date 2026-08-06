package com.salecrm.crmhistory.dto;

import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.InviteStatus;

import java.time.Instant;

/**
 * Filter parameters for CRM history queries.
 * All fields are optional; null means "no filter on this field".
 */
public record CrmHistoryFilter(
        Long branchId,
        String search,
        ActionType actionType,
        InviteStatus inviteStatus,
        String phone,
        String createdBy,
        Instant createdFrom,
        Instant createdToExclusive,
        String amountBucket,
        Long regionId,
        Long townshipId
) {
}
