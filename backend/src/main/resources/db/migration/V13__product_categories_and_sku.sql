-- Product categories + SKU on products

CREATE TABLE IF NOT EXISTS product_categories (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120),
    CONSTRAINT uk_product_categories_name UNIQUE (name)
);

INSERT INTO product_categories (name, sort_order, active)
VALUES
    ('Diamond', 1, TRUE),
    ('Gold', 2, TRUE),
    ('PT', 3, TRUE)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(80);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id BIGINT;

-- Backfill SKU for existing rows
UPDATE products
SET sku = 'SKU-' || LPAD(id::text, 6, '0')
WHERE sku IS NULL OR btrim(sku) = '';

-- Link existing free-text category to category table when possible
UPDATE products p
SET category_id = c.id
FROM product_categories c
WHERE p.category_id IS NULL
  AND lower(btrim(p.category)) = lower(c.name);

-- Fallback: assign first category
UPDATE products
SET category_id = (SELECT id FROM product_categories ORDER BY sort_order ASC, id ASC LIMIT 1)
WHERE category_id IS NULL;

ALTER TABLE products ALTER COLUMN sku SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_products_sku'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT uk_products_sku UNIQUE (sku);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_category'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT fk_products_category
            FOREIGN KEY (category_id) REFERENCES product_categories (id);
    END IF;
END $$;

ALTER TABLE products ALTER COLUMN category_id SET NOT NULL;

-- Keep legacy category column in sync for readability (optional denormalized name)
UPDATE products p
SET category = c.name
FROM product_categories c
WHERE p.category_id = c.id;
