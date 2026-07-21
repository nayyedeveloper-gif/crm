-- Operational Show Case inventory (branch / shop scoped — not public shop catalog)

CREATE TABLE IF NOT EXISTS showcase_items (
    id              BIGSERIAL PRIMARY KEY,
    branch_id       BIGINT       NOT NULL REFERENCES branches (id),
    item_code       VARCHAR(80)  NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     VARCHAR(2000),
    price_mmk       NUMERIC(14, 2),
    weight_gram     NUMERIC(12, 3),
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    version         BIGINT       NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120),
    CONSTRAINT uk_showcase_branch_code UNIQUE (branch_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_showcase_items_branch ON showcase_items (branch_id);
CREATE INDEX IF NOT EXISTS idx_showcase_items_updated ON showcase_items (updated_at DESC);

CREATE TABLE IF NOT EXISTS showcase_images (
    id                BIGSERIAL PRIMARY KEY,
    showcase_item_id  BIGINT       NOT NULL REFERENCES showcase_items (id) ON DELETE CASCADE,
    file_path         VARCHAR(500) NOT NULL,
    sort_order        INT          NOT NULL DEFAULT 0,
    version           BIGINT       NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(120),
    updated_by        VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_showcase_images_item ON showcase_images (showcase_item_id, sort_order);

-- Permission: CRM Show Case (Allow / None)
INSERT INTO role_permissions (permission_key, role, access_level)
SELECT v.permission_key, v.role, v.access_level
FROM (VALUES
    ('SHOWCASE_MANAGE', 'ADMIN', 'ALLOW'),
    ('SHOWCASE_MANAGE', 'MANAGER', 'ALLOW'),
    ('SHOWCASE_MANAGE', 'STAFF', 'NONE')
) AS v(permission_key, role, access_level)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_key = v.permission_key AND rp.role = v.role
);
