-- Shop module permissions (Allow / None)
INSERT INTO role_permissions (permission_key, role, access_level)
SELECT v.permission_key, v.role, v.access_level
FROM (VALUES
    ('SHOP_DASHBOARD_VIEW', 'ADMIN', 'ALLOW'),
    ('SHOP_DASHBOARD_VIEW', 'MANAGER', 'ALLOW'),
    ('SHOP_DASHBOARD_VIEW', 'STAFF', 'NONE'),
    ('ORDERS_MANAGE', 'ADMIN', 'ALLOW'),
    ('ORDERS_MANAGE', 'MANAGER', 'ALLOW'),
    ('ORDERS_MANAGE', 'STAFF', 'NONE'),
    ('INQUIRIES_MANAGE', 'ADMIN', 'ALLOW'),
    ('INQUIRIES_MANAGE', 'MANAGER', 'ALLOW'),
    ('INQUIRIES_MANAGE', 'STAFF', 'NONE'),
    ('SHOP_USERS_MANAGE', 'ADMIN', 'ALLOW'),
    ('SHOP_USERS_MANAGE', 'MANAGER', 'ALLOW'),
    ('SHOP_USERS_MANAGE', 'STAFF', 'NONE')
) AS v(permission_key, role, access_level)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_key = v.permission_key AND rp.role = v.role
);

-- Ensure PRODUCTS_MANAGE rows exist for all roles (already seeded in V12 for typical installs)
INSERT INTO role_permissions (permission_key, role, access_level)
SELECT v.permission_key, v.role, v.access_level
FROM (VALUES
    ('PRODUCTS_MANAGE', 'ADMIN', 'ALLOW'),
    ('PRODUCTS_MANAGE', 'MANAGER', 'ALLOW'),
    ('PRODUCTS_MANAGE', 'STAFF', 'NONE')
) AS v(permission_key, role, access_level)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_key = v.permission_key AND rp.role = v.role
);
