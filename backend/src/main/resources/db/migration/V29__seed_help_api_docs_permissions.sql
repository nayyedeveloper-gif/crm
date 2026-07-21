-- How to use + API Docs (Allow / None)
INSERT INTO role_permissions (permission_key, role, access_level)
SELECT v.permission_key, v.role, v.access_level
FROM (VALUES
    ('HELP_VIEW', 'ADMIN', 'ALLOW'),
    ('HELP_VIEW', 'MANAGER', 'NONE'),
    ('HELP_VIEW', 'STAFF', 'NONE'),
    ('API_DOCS_VIEW', 'ADMIN', 'ALLOW'),
    ('API_DOCS_VIEW', 'MANAGER', 'NONE'),
    ('API_DOCS_VIEW', 'STAFF', 'NONE')
) AS v(permission_key, role, access_level)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_key = v.permission_key AND rp.role = v.role
);
