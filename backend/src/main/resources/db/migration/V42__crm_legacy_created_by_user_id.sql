ALTER TABLE crm_history
    ADD COLUMN IF NOT EXISTS legacy_created_by_user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_crm_legacy_created_by_user_id
    ON crm_history (legacy_created_by_user_id);
