-- Sales dashboard module (standalone; not linked to Shop / CRM History)

INSERT INTO role_permissions (permission_key, role, access_level) VALUES
    ('SALES_VIEW', 'ADMIN', 'ALLOW'),
    ('SALES_VIEW', 'MANAGER', 'ALLOW'),
    ('SALES_VIEW', 'STAFF', 'ALLOW')
ON CONFLICT (permission_key, role) DO NOTHING;
