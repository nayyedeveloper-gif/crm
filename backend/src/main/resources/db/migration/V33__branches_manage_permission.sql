-- Branch / Shop management permission
INSERT INTO role_permissions (permission_key, role, access_level)
SELECT v.permission_key, v.role, v.access_level
FROM (VALUES
    ('BRANCHES_MANAGE', 'ADMIN', 'ALLOW'),
    ('BRANCHES_MANAGE', 'MANAGER', 'NONE'),
    ('BRANCHES_MANAGE', 'STAFF', 'NONE')
) AS v(permission_key, role, access_level)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_key = v.permission_key AND rp.role = v.role
);
