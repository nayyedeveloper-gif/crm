-- Checkout terms & conditions text (empty = no agreement checkbox required)

ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS shop_checkout_terms TEXT;
