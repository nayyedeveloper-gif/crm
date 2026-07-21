-- Shop customer tiers + Facebook-style trust badge
ALTER TABLE shop_customers
    ADD COLUMN IF NOT EXISTS customer_tier VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    ADD COLUMN IF NOT EXISTS trusted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS crm_note TEXT;

ALTER TABLE shop_customers
    DROP CONSTRAINT IF EXISTS chk_shop_customers_tier;

ALTER TABLE shop_customers
    ADD CONSTRAINT chk_shop_customers_tier
        CHECK (customer_tier IN ('CUSTOMER', 'VIP', 'VVIP'));

CREATE INDEX IF NOT EXISTS idx_shop_customers_tier ON shop_customers (customer_tier);
CREATE INDEX IF NOT EXISTS idx_shop_customers_trusted ON shop_customers (trusted);
CREATE INDEX IF NOT EXISTS idx_shop_customers_created ON shop_customers (created_at DESC);
