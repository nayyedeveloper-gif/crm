package com.salecrm.crmhistory.dto;

import com.salecrm.crmhistory.entity.ActionType;

/**
 * Filter parameters for CRM history queries.
 * All fields are optional; null means "no filter on this field".
 */
public record CrmHistoryFilter(
        Long branchId,
        String search,
        ActionType actionType,
        String phone,
        Long regionId,
        Long townshipId
) {
}
