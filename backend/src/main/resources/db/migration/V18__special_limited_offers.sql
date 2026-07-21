-- Limited Time Offer / Special items

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS special_offer BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS offer_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS offer_headline VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_products_special_offer_active
    ON products (special_offer, active, offer_ends_at)
    WHERE special_offer = TRUE AND active = TRUE;
