-- Incomplete geo rows must not pollute region performance.
DELETE FROM crm_history WHERE region_id IS NULL;
