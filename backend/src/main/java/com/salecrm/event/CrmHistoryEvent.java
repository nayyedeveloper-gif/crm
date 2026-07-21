package com.salecrm.event;

import java.time.Instant;

/**
 * Event published to Kafka when a CRM history record is created, updated, or deleted.
 */
public record CrmHistoryEvent(
        Long crmHistoryId,
        Long branchId,
        String action,
        String performedBy,
        Instant timestamp
) {
    public static final String ACTION_CREATED = "CREATED";
    public static final String ACTION_UPDATED = "UPDATED";
    public static final String ACTION_DELETED = "DELETED";
}
