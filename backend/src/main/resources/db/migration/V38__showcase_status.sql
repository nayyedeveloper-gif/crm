-- Showcase operational status for approval / sold workflow
ALTER TABLE showcase_items
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

UPDATE showcase_items
SET status = 'APPROVED'
WHERE status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS idx_showcase_items_status ON showcase_items (status);
