-- Run on the shop_sale server (MySQL) as a privileged user.
-- Creates a read-only account for Sale-CRM Spring Boot legacy bridge.

CREATE USER IF NOT EXISTS 'shop_sale_java'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
CREATE USER IF NOT EXISTS 'shop_sale_java'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

GRANT SELECT ON shop_sales.* TO 'shop_sale_java'@'localhost';
GRANT SELECT ON shop_sales.* TO 'shop_sale_java'@'127.0.0.1';

FLUSH PRIVILEGES;

-- Verify:
-- SELECT user, host FROM mysql.user WHERE user = 'shop_sale_java';
-- SHOW GRANTS FOR 'shop_sale_java'@'localhost';
