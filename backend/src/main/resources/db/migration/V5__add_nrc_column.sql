-- =====================================================================
-- V5: Add NRC (National Registration Card) column to crm_history
-- =====================================================================

ALTER TABLE crm_history ADD COLUMN IF NOT EXISTS nrc VARCHAR(30);
