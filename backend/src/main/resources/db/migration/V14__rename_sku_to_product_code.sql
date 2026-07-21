-- Rename sku → product_code (manual product codes e.g. GD-0001)

ALTER TABLE products RENAME COLUMN sku TO product_code;

ALTER TABLE products DROP CONSTRAINT IF EXISTS uk_products_sku;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_products_product_code'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT uk_products_product_code UNIQUE (product_code);
    END IF;
END $$;

-- Normalize old auto backfill SKU-000001 → GD-0001 style
UPDATE products
SET product_code = 'GD-' || LPAD(id::text, 4, '0')
WHERE product_code ~* '^SKU-';
