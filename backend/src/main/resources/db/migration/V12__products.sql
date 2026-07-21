-- Products with public QR codes and four image slots

CREATE TABLE IF NOT EXISTS products (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    public_code     VARCHAR(32) NOT NULL,
    image_front     VARCHAR(500),
    image_back      VARCHAR(500),
    image_side      VARCHAR(500),
    image_other     VARCHAR(500),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120),
    CONSTRAINT uk_products_public_code UNIQUE (public_code)
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);

INSERT INTO role_permissions (permission_key, role, access_level)
SELECT v.permission_key, v.role, v.access_level
FROM (VALUES
    ('PRODUCTS_MANAGE', 'ADMIN', 'ALLOW'),
    ('PRODUCTS_MANAGE', 'MANAGER', 'ALLOW'),
    ('PRODUCTS_MANAGE', 'STAFF', 'NONE')
) AS v(permission_key, role, access_level)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_key = v.permission_key AND rp.role = v.role
);
