package com.salecrm.webhook.dto;

import java.time.Instant;
import java.util.List;

public record N8nWebhookConfigResponse(
        boolean enabled,
        String outboundUrl,
        boolean hasSecret,
        List<String> events,
        boolean inboundEnabled,
        String inboundPath,
        Instant lastDeliveryAt,
        String lastDeliveryStatus,
        String lastDeliveryError,
        List<String> availableEvents
) {
}
