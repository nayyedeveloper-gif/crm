-- Sales dashboard data (migrated from Google Sheets; no sheet dependency at runtime)

CREATE TABLE IF NOT EXISTS sales_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    transaction_ts      VARCHAR(48),
    sale_date           DATE,
    branch_name         VARCHAR(160) NOT NULL,
    reason              VARCHAR(120),
    sales_staff         VARCHAR(160),
    customer_service    VARCHAR(160),
    buyer_name          VARCHAR(200),
    contact_number      VARCHAR(80),
    township            VARCHAR(120),
    region              VARCHAR(120),
    customer_type       VARCHAR(80),
    group_size          INTEGER,
    qty                 NUMERIC(14, 3),
    gram                NUMERIC(16, 4),
    amount              NUMERIC(18, 2),
    item_category       VARCHAR(160),
    item_main_group     VARCHAR(160),
    items_code          VARCHAR(120),
    purity              VARCHAR(40),
    special_event       VARCHAR(240),
    version             BIGINT       NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(120),
    updated_by          VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_sales_tx_sale_date ON sales_transactions (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_tx_branch ON sales_transactions (branch_name);
CREATE INDEX IF NOT EXISTS idx_sales_tx_reason ON sales_transactions (reason);
CREATE INDEX IF NOT EXISTS idx_sales_tx_date_branch ON sales_transactions (sale_date, branch_name);

CREATE TABLE IF NOT EXISTS sales_monthly_targets (
    id                  BIGSERIAL PRIMARY KEY,
    month_label         VARCHAR(32)  NOT NULL,
    shop_name           VARCHAR(160) NOT NULL,
    company_total       BOOLEAN      NOT NULL DEFAULT FALSE,
    diamond_qty         NUMERIC(14, 2),
    diamond_amount      NUMERIC(18, 2),
    pt_qty              NUMERIC(14, 2),
    pt_amount           NUMERIC(18, 2),
    gold15_qty          NUMERIC(14, 2),
    gold15_amount       NUMERIC(18, 2),
    gold16_qty          NUMERIC(14, 2),
    gold16_amount       NUMERIC(18, 2),
    total_qty           NUMERIC(14, 2),
    total_amount        NUMERIC(18, 2),
    version             BIGINT       NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(120),
    updated_by          VARCHAR(120),
    CONSTRAINT uk_sales_monthly_targets UNIQUE (month_label, shop_name)
);

CREATE INDEX IF NOT EXISTS idx_sales_targets_month ON sales_monthly_targets (month_label);

-- Admin-only CSV import for sales data
INSERT INTO role_permissions (permission_key, role, access_level)
SELECT v.permission_key, v.role, v.access_level
FROM (VALUES
    ('SALES_IMPORT', 'ADMIN', 'ALLOW'),
    ('SALES_IMPORT', 'MANAGER', 'NONE'),
    ('SALES_IMPORT', 'STAFF', 'NONE')
) AS v(permission_key, role, access_level)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_key = v.permission_key AND rp.role = v.role
);
