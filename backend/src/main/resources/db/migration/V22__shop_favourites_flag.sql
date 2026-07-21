-- Shop favourites (wishlist) feature flag

ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS shop_favourites_enabled BOOLEAN NOT NULL DEFAULT TRUE;
