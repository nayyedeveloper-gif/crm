package com.salecrm.webhook.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.webhook.dto.N8nInboundResponse;
import com.salecrm.webhook.service.N8nWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public inbound endpoint for n8n HTTP Request nodes.
 * Authenticate with header {@code X-Webhook-Secret}.
 */
@RestController
@RequestMapping("/webhooks/n8n")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class N8nWebhookInboundController {

    private final N8nWebhookService webhookService;

    @PostMapping
    public ApiResponse<N8nInboundResponse> receive(
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secret,
            @RequestBody(required = false) Map<String, Object> body) {
        return ApiResponse.ok(webhookService.receiveInbound(secret, body));
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.ok(Map.of(
                "ok", true,
                "integration", "n8n",
                "path", N8nWebhookService.INBOUND_PATH
        ));
    }
}
