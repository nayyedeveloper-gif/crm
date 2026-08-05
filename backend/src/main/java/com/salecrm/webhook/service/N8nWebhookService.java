package com.salecrm.webhook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.webhook.dto.N8nInboundResponse;
import com.salecrm.webhook.dto.N8nWebhookConfigResponse;
import com.salecrm.webhook.dto.N8nWebhookConfigUpdateRequest;
import com.salecrm.webhook.dto.N8nWebhookTestResponse;
import com.salecrm.webhook.entity.N8nWebhookConfig;
import com.salecrm.webhook.repository.N8nWebhookConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class N8nWebhookService {

    public static final String INBOUND_PATH = "/webhooks/n8n";
    public static final List<String> AVAILABLE_EVENTS = List.of(
            "showcase.created",
            "showcase.updated",
            "showcase.deleted",
            "sales.created",
            "inquiry.created",
            "inquiry.status",
            "order.created",
            "order.status",
            "webhook.test"
    );

    private static final Set<String> AVAILABLE_SET = Set.copyOf(AVAILABLE_EVENTS);
    private static final Long CONFIG_ID = 1L;

    private final N8nWebhookConfigRepository configRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    @Transactional(readOnly = true)
    public N8nWebhookConfigResponse getConfig() {
        N8nWebhookConfig config = configRepository.findById(CONFIG_ID)
                .orElse(N8nWebhookConfig.builder()
                        .id(CONFIG_ID)
                        .enabled(false)
                        .inboundEnabled(true)
                        .events(String.join(",", AVAILABLE_EVENTS.stream()
                                .filter(e -> !e.equals("webhook.test"))
                                .toList()))
                        .build());
        return toResponse(config);
    }

    @Transactional
    public N8nWebhookConfigResponse updateConfig(N8nWebhookConfigUpdateRequest request) {
        N8nWebhookConfig config = requireConfig();
        if (request.enabled() != null) {
            config.setEnabled(request.enabled());
        }
        if (request.outboundUrl() != null) {
            String url = request.outboundUrl().trim();
            config.setOutboundUrl(url.isEmpty() ? null : validateUrl(url));
        }
        if (Boolean.TRUE.equals(request.clearSecret())) {
            config.setSecret(null);
        } else if (StringUtils.hasText(request.secret())) {
            config.setSecret(request.secret().trim());
        }
        if (request.events() != null) {
            config.setEvents(normalizeEvents(request.events()));
        }
        if (request.inboundEnabled() != null) {
            config.setInboundEnabled(request.inboundEnabled());
        }
        if (config.isEnabled() && !StringUtils.hasText(config.getOutboundUrl())) {
            throw new BusinessException("Outbound webhook URL is required when enabled");
        }
        N8nWebhookConfig saved = configRepository.save(config);
        auditLogService.change("N8N_WEBHOOK", "UPDATE", "n8n webhook settings updated",
                "enabled=" + saved.isEnabled());
        return toResponse(saved);
    }

    @Transactional
    public N8nWebhookTestResponse sendTest() {
        N8nWebhookConfig config = requireConfig();
        if (!StringUtils.hasText(config.getOutboundUrl())) {
            throw new BusinessException("Set an outbound webhook URL first");
        }
        Map<String, Object> payload = basePayload("webhook.test", Map.of(
                "message", "Sale CRM → n8n test ping",
                "ok", true
        ));
        DeliveryResult result = deliverSync(config, payload);
        config.setLastDeliveryAt(Instant.now());
        config.setLastDeliveryStatus(result.success() ? "OK" : "FAILED");
        config.setLastDeliveryError(result.success() ? null : result.message());
        configRepository.save(config);
        return new N8nWebhookTestResponse(
                result.success(),
                result.statusCode(),
                result.message()
        );
    }

    /** Fire-and-forget outbound event to n8n (never blocks caller). */
    @Async
    public void dispatch(String event, Object data) {
        try {
            N8nWebhookConfig config = configRepository.findById(CONFIG_ID).orElse(null);
            if (config == null || !config.isEnabled() || !StringUtils.hasText(config.getOutboundUrl())) {
                return;
            }
            if (!isEventEnabled(config.getEvents(), event)) {
                return;
            }
            Map<String, Object> payload = basePayload(event, data);
            DeliveryResult result = deliverSync(config, payload);
            configRepository.findById(config.getId()).ifPresent(fresh -> {
                fresh.setLastDeliveryAt(Instant.now());
                fresh.setLastDeliveryStatus(result.success() ? "OK" : "FAILED");
                fresh.setLastDeliveryError(result.success() ? null : result.message());
                configRepository.save(fresh);
            });
            if (!result.success()) {
                log.warn("n8n webhook delivery failed for {}: {}", event, result.message());
            }
        } catch (Exception ex) {
            log.warn("n8n webhook dispatch error for {}: {}", event, ex.getMessage());
        }
    }

    @Transactional
    public N8nInboundResponse receiveInbound(String secretHeader, Map<String, Object> body) {
        N8nWebhookConfig config = requireConfig();
        if (!config.isInboundEnabled()) {
            throw new BusinessException("Inbound n8n webhook is disabled", HttpStatus.FORBIDDEN);
        }
        if (!StringUtils.hasText(config.getSecret())) {
            throw new BusinessException("Inbound webhook secret is not configured", HttpStatus.FORBIDDEN);
        }
        if (!secureEquals(config.getSecret(), secretHeader)) {
            throw new BusinessException("Invalid webhook secret", HttpStatus.UNAUTHORIZED);
        }
        Map<String, Object> echo = body != null ? body : Map.of();
        auditLogService.change("N8N_WEBHOOK", "INBOUND",
                "Inbound n8n webhook received",
                "keys=" + echo.keySet());
        return new N8nInboundResponse(true, "Accepted", echo);
    }

    private N8nWebhookConfig requireConfig() {
        return configRepository.findById(CONFIG_ID).orElseGet(() -> {
            N8nWebhookConfig created = N8nWebhookConfig.builder()
                    .id(CONFIG_ID)
                    .enabled(false)
                    .inboundEnabled(true)
                    .events(String.join(",", AVAILABLE_EVENTS.stream()
                            .filter(e -> !e.equals("webhook.test"))
                            .toList()))
                    .build();
            return configRepository.save(created);
        });
    }

    private N8nWebhookConfigResponse toResponse(N8nWebhookConfig config) {
        return new N8nWebhookConfigResponse(
                config.isEnabled(),
                config.getOutboundUrl(),
                StringUtils.hasText(config.getSecret()),
                parseEvents(config.getEvents()),
                config.isInboundEnabled(),
                INBOUND_PATH,
                config.getLastDeliveryAt(),
                config.getLastDeliveryStatus(),
                config.getLastDeliveryError(),
                AVAILABLE_EVENTS
        );
    }

    private Map<String, Object> basePayload(String event, Object data) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", event);
        payload.put("source", "sale-crm");
        payload.put("timestamp", Instant.now().toString());
        payload.put("data", data);
        return payload;
    }

    private DeliveryResult deliverSync(N8nWebhookConfig config, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(config.getOutboundUrl()))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .header("User-Agent", "SaleCRM-n8n-Webhook/1.0")
                    .header("X-SaleCRM-Event", String.valueOf(payload.get("event")))
                    .POST(HttpRequest.BodyPublishers.ofString(json));

            if (StringUtils.hasText(config.getSecret())) {
                builder.header("X-SaleCRM-Signature", "sha256=" + hmacSha256(config.getSecret(), json));
                builder.header("X-Webhook-Secret", config.getSecret());
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            boolean ok = code >= 200 && code < 300;
            String body = response.body();
            String msg = ok
                    ? "Delivered (" + code + ")"
                    : "HTTP " + code + (StringUtils.hasText(body) ? ": " + truncate(body, 180) : "");
            return new DeliveryResult(ok, code, msg);
        } catch (Exception ex) {
            return new DeliveryResult(false, 0, truncate(ex.getMessage(), 200));
        }
    }

    private static String validateUrl(String url) {
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!scheme.equals("https") && !scheme.equals("http")) {
                throw new BusinessException("Webhook URL must start with http:// or https://");
            }
            if (!StringUtils.hasText(uri.getHost())) {
                throw new BusinessException("Webhook URL host is required");
            }
            return url;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("Invalid webhook URL");
        }
    }

    private static String normalizeEvents(List<String> events) {
        List<String> cleaned = events.stream()
                .filter(StringUtils::hasText)
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(AVAILABLE_SET::contains)
                .distinct()
                .toList();
        if (cleaned.isEmpty()) {
            throw new BusinessException("Select at least one event");
        }
        return String.join(",", cleaned);
    }

    private static List<String> parseEvents(String raw) {
        if (!StringUtils.hasText(raw)) return List.of();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toList();
    }

    private static boolean isEventEnabled(String raw, String event) {
        return parseEvents(raw).stream().anyMatch(e -> e.equalsIgnoreCase(event));
    }

    private static String hmacSha256(String secret, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BusinessException("Failed to sign webhook payload");
        }
    }

    private static boolean secureEquals(String expected, String provided) {
        if (!StringUtils.hasText(expected) || !StringUtils.hasText(provided)) return false;
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = provided.getBytes(StandardCharsets.UTF_8);
        if (a.length != b.length) return false;
        int result = 0;
        for (int i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result == 0;
    }

    private static String truncate(String value, int max) {
        if (value == null) return "unknown error";
        return value.length() <= max ? value : value.substring(0, max) + "…";
    }

    private record DeliveryResult(boolean success, int statusCode, String message) {
    }
}
