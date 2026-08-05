package com.salecrm.webhook.dto;

public record N8nWebhookTestResponse(
        boolean success,
        int statusCode,
        String message
) {
}
