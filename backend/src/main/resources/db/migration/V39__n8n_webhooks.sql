-- n8n webhook integration config (single-row)
CREATE TABLE IF NOT EXISTS n8n_webhook_config (
    id              BIGINT PRIMARY KEY,
    enabled         BOOLEAN      NOT NULL DEFAULT FALSE,
    outbound_url    VARCHAR(500),
    secret          VARCHAR(120),
    events          VARCHAR(500) NOT NULL DEFAULT 'showcase.created,showcase.updated,sales.created,inquiry.created,order.created,order.status',
    inbound_enabled BOOLEAN      NOT NULL DEFAULT TRUE,
    last_delivery_at TIMESTAMPTZ,
    last_delivery_status VARCHAR(40),
    last_delivery_error  VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(80),
    updated_by      VARCHAR(80),
    version         BIGINT       NOT NULL DEFAULT 0
);

INSERT INTO n8n_webhook_config (id, enabled, events, inbound_enabled, created_by, updated_by)
VALUES (
    1,
    FALSE,
    'showcase.created,showcase.updated,sales.created,inquiry.created,order.created,order.status',
    TRUE,
    'system',
    'system'
)
ON CONFLICT (id) DO NOTHING;
