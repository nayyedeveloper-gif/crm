-- Show Case sub categories (Diamond / Gold / PT)

CREATE TABLE IF NOT EXISTS showcase_subcategories (
    id              BIGSERIAL PRIMARY KEY,
    category_id     BIGINT NOT NULL REFERENCES product_categories (id),
    name            VARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120),
    CONSTRAINT uk_showcase_subcat_category_name UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_showcase_subcategories_category
    ON showcase_subcategories (category_id, sort_order, name);

ALTER TABLE showcase_items
    ADD COLUMN IF NOT EXISTS subcategory_id BIGINT REFERENCES showcase_subcategories (id),
    ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_showcase_items_subcategory
    ON showcase_items (subcategory_id);
