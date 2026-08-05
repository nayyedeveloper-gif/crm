package com.salecrm.webhook.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.webhook.dto.N8nWebhookConfigResponse;
import com.salecrm.webhook.dto.N8nWebhookConfigUpdateRequest;
import com.salecrm.webhook.dto.N8nWebhookTestResponse;
import com.salecrm.webhook.service.N8nWebhookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/settings/webhooks/n8n")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('SETTINGS_GENERAL')")
@SuppressWarnings("null")
public class N8nWebhookSettingsController {

    private final N8nWebhookService webhookService;

    @GetMapping
    public ApiResponse<N8nWebhookConfigResponse> get() {
        return ApiResponse.ok(webhookService.getConfig());
    }

    @PutMapping
    public ApiResponse<N8nWebhookConfigResponse> update(@Valid @RequestBody N8nWebhookConfigUpdateRequest request) {
        return ApiResponse.ok(webhookService.updateConfig(request), "n8n webhook settings saved");
    }

    @PostMapping("/test")
    public ApiResponse<N8nWebhookTestResponse> test() {
        return ApiResponse.ok(webhookService.sendTest(), "Test webhook sent");
    }
}
