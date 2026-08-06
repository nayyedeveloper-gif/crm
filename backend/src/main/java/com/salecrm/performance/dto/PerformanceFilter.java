package com.salecrm.performance.dto;

import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.InviteStatus;

import java.time.Instant;

public record PerformanceFilter(
        Long branchId,
        ActionType actionType,
        InviteStatus inviteStatus,
        Long regionId,
        Long townshipId,
        Instant from,
        Instant to
) {
}
