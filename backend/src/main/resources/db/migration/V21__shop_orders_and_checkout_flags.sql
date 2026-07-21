-- Shop checkout / orders / MMQR feature flags + orders table

ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS shop_checkout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shop_orders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shop_mmqr_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shop_mmqr_image VARCHAR(500),
    ADD COLUMN IF NOT EXISTS shop_mmqr_note TEXT;

CREATE TABLE IF NOT EXISTS shop_orders (
    id               BIGSERIAL PRIMARY KEY,
    order_code       VARCHAR(32) NOT NULL,
    customer_name    VARCHAR(160) NOT NULL,
    phone            VARCHAR(40) NOT NULL,
    address          TEXT,
    note             TEXT,
    items_json       TEXT NOT NULL,
    total_amount     NUMERIC(18, 2),
    status           VARCHAR(40) NOT NULL DEFAULT 'PENDING_PAYMENT',
    tracking_number  VARCHAR(120),
    payment_method   VARCHAR(40),
    payment_ref      VARCHAR(160),
    version          BIGINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by       VARCHAR(120),
    updated_by       VARCHAR(120),
    CONSTRAINT uk_shop_orders_code UNIQUE (order_code)
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_phone_created
    ON shop_orders (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_orders_status_created
    ON shop_orders (status, created_at DESC);
