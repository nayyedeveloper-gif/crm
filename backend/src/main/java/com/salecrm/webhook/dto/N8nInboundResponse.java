package com.salecrm.webhook.dto;

import java.util.Map;

public record N8nInboundResponse(
        boolean accepted,
        String message,
        Map<String, Object> echo
) {
}
