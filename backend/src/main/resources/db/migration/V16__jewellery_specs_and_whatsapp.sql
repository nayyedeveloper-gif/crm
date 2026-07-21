-- Jewellery product specs + featured flag; shop WhatsApp for inquiry CTA

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS metal_purity VARCHAR(40),
    ADD COLUMN IF NOT EXISTS weight_gram NUMERIC(12, 3),
    ADD COLUMN IF NOT EXISTS stone_carat NUMERIC(12, 3);

CREATE INDEX IF NOT EXISTS idx_products_featured_active
    ON products (featured, active) WHERE featured = TRUE AND active = TRUE;

ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS shop_whatsapp VARCHAR(40);
