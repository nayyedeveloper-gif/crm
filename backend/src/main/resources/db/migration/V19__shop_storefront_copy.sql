-- Editable storefront copy (hero + special offer)

ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS shop_eyebrow VARCHAR(120),
    ADD COLUMN IF NOT EXISTS shop_headline VARCHAR(200),
    ADD COLUMN IF NOT EXISTS shop_subtitle TEXT,
    ADD COLUMN IF NOT EXISTS shop_cta_label VARCHAR(80),
    ADD COLUMN IF NOT EXISTS shop_brand_line VARCHAR(120),
    ADD COLUMN IF NOT EXISTS shop_offer_badge VARCHAR(80),
    ADD COLUMN IF NOT EXISTS shop_offer_blurb TEXT,
    ADD COLUMN IF NOT EXISTS shop_offer_cta VARCHAR(80),
    ADD COLUMN IF NOT EXISTS shop_collection_cta VARCHAR(80);

UPDATE app_settings
SET shop_eyebrow = COALESCE(shop_eyebrow, 'Grand Opening · Gems & Jewellery'),
    shop_headline = COALESCE(shop_headline, app_name),
    shop_subtitle = COALESCE(
        shop_subtitle,
        'Celebrating our Grand Opening — discover crafted pieces across Diamond, Gold and PT. Explore the collection and open any item for full details.'
    ),
    shop_cta_label = COALESCE(shop_cta_label, 'Browse collection'),
    shop_brand_line = COALESCE(shop_brand_line, 'Gems & Jewellery'),
    shop_offer_badge = COALESCE(shop_offer_badge, 'Grand Opening'),
    shop_offer_blurb = COALESCE(
        shop_offer_blurb,
        'Celebrate our Grand Opening with an exclusive piece — inquire now before the offer ends.'
    ),
    shop_offer_cta = COALESCE(shop_offer_cta, 'View this piece'),
    shop_collection_cta = COALESCE(shop_collection_cta, 'Full collection')
WHERE id = 1;
