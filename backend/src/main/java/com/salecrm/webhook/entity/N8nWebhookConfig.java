package com.salecrm.webhook.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "n8n_webhook_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class N8nWebhookConfig extends BaseEntity {

    @Id
    private Long id;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private boolean enabled = false;

    @Column(name = "outbound_url", length = 500)
    private String outboundUrl;

    @Column(name = "secret", length = 120)
    private String secret;

    @Column(name = "events", nullable = false, length = 500)
    @Builder.Default
    private String events =
            "showcase.created,showcase.updated,sales.created,inquiry.created,order.created,order.status";

    @Column(name = "inbound_enabled", nullable = false)
    @Builder.Default
    private boolean inboundEnabled = true;

    @Column(name = "last_delivery_at")
    private Instant lastDeliveryAt;

    @Column(name = "last_delivery_status", length = 40)
    private String lastDeliveryStatus;

    @Column(name = "last_delivery_error", length = 500)
    private String lastDeliveryError;
}
