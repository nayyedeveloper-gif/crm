-- Category + jewellery specs for Show Case (Gold / Diamond / Platinum)

ALTER TABLE showcase_items
    ADD COLUMN IF NOT EXISTS category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES product_categories (id),
    ADD COLUMN IF NOT EXISTS metal_purity VARCHAR(80),
    ADD COLUMN IF NOT EXISTS stone_carat NUMERIC(12, 3);

UPDATE showcase_items
SET category = 'Gold'
WHERE category IS NULL;

UPDATE showcase_items si
SET category_id = pc.id
FROM product_categories pc
WHERE si.category_id IS NULL
  AND si.category IS NOT NULL
  AND LOWER(pc.name) = LOWER(si.category);

-- Fallback: first active category
UPDATE showcase_items si
SET category_id = (
    SELECT id FROM product_categories WHERE active = TRUE ORDER BY sort_order ASC, name ASC LIMIT 1
)
WHERE si.category_id IS NULL;

ALTER TABLE showcase_items
    ALTER COLUMN category SET NOT NULL;

-- category_id nullable for legacy rows without matching category; new rows require it in app layer
