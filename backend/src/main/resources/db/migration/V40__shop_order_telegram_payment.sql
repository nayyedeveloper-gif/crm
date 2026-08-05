-- Telegram bot orders: chat id for customer notifies + manual payment status (MMQR later)

ALTER TABLE shop_orders
    ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64);

ALTER TABLE shop_orders
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID';

UPDATE shop_orders
SET payment_status = 'UNPAID'
WHERE payment_status IS NULL OR payment_status = '';
