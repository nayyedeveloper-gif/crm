-- Display price for jewellery catalog (MMK). Nullable = "Price on inquiry".
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS price NUMERIC(18, 2);

-- Public storefront inquiry requests (no payment / cart checkout).
CREATE TABLE IF NOT EXISTS shop_inquiries (
    id              BIGSERIAL PRIMARY KEY,
    customer_name   VARCHAR(160) NOT NULL,
    phone           VARCHAR(40) NOT NULL,
    note            TEXT,
    items_json      TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'NEW',
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_shop_inquiries_status_created
    ON shop_inquiries (status, created_at DESC);
