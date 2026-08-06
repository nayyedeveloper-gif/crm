-- CRM legacy import support (Laravel shop_sales → Sale-CRM PostgreSQL)

ALTER TABLE crm_history
    ADD COLUMN IF NOT EXISTS legacy_id BIGINT,
    ADD COLUMN IF NOT EXISTS invite_status VARCHAR(40),
    ADD COLUMN IF NOT EXISTS customer_condition VARCHAR(120);

-- PostgreSQL UNIQUE allows multiple NULLs, so this is safe for non-imported rows
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_crm_history_legacy_id'
    ) THEN
        ALTER TABLE crm_history ADD CONSTRAINT uk_crm_history_legacy_id UNIQUE (legacy_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_invite_status
    ON crm_history (invite_status);

INSERT INTO branches (code, name, phone, address, active, version, created_at, updated_at, created_by, updated_by)
SELECT 'BA-AN', 'ဘားအံမြို့', NULL, 'ဘားအံ', TRUE, 0, now(), now(), 'legacy-import', 'legacy-import'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE code = 'BA-AN' OR name = 'ဘားအံမြို့');
