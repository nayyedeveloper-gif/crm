package com.salecrm.webhook.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public record N8nWebhookConfigUpdateRequest(
        Boolean enabled,
        @Size(max = 500) String outboundUrl,
        @Size(max = 120) String secret,
        Boolean clearSecret,
        List<String> events,
        Boolean inboundEnabled
) {
}
