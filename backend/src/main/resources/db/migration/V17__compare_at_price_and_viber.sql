-- Sale / special discount (compare-at) price + shop Viber for inquiry CTA

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(18, 2);

ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS shop_viber VARCHAR(40);
