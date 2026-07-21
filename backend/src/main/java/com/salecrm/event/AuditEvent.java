package com.salecrm.event;

import java.time.Instant;
import java.util.Map;

/**
 * Generic audit event published to Kafka for compliance / traceability.
 */
public record AuditEvent(
        String eventType,
        String performedBy,
        Long branchId,
        String resourceType,
        String resourceId,
        Map<String, Object> details,
        Instant timestamp
) {
}
