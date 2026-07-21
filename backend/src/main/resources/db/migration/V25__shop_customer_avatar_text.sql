-- Allow profile photos (data URLs) and longer avatar values
ALTER TABLE shop_customers
    ALTER COLUMN avatar_url TYPE TEXT;
