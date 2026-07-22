ALTER TABLE sales_transactions
    ADD COLUMN IF NOT EXISTS buyer_nrc VARCHAR(80),
    ADD COLUMN IF NOT EXISTS form_extra TEXT;
