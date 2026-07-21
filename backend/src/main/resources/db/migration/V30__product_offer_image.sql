-- Dedicated Limited Time / Special Offer banner image (separate from gallery Front/Back/Side/Other)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image_offer VARCHAR(500);
