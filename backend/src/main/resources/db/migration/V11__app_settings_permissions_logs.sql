-- App settings, backup destination, role permissions, change/system logs

CREATE TABLE IF NOT EXISTS app_settings (
    id              BIGINT PRIMARY KEY,
    app_name        VARCHAR(120) NOT NULL DEFAULT 'Sale CRM',
    app_version     VARCHAR(40) NOT NULL DEFAULT '1.0.0',
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120)
);

INSERT INTO app_settings (id, app_name, app_version)
VALUES (1, 'Sale CRM', '1.0.0')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS destination_type VARCHAR(30) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS destination_path VARCHAR(500) NOT NULL DEFAULT './data/backups';
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(200);

ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS destination_type VARCHAR(30);
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS destination_path VARCHAR(500);

CREATE TABLE IF NOT EXISTS role_permissions (
    id              BIGSERIAL PRIMARY KEY,
    permission_key  VARCHAR(80) NOT NULL,
    role            VARCHAR(20) NOT NULL,
    access_level    VARCHAR(20) NOT NULL DEFAULT 'NONE',
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120),
    CONSTRAINT uk_role_permission UNIQUE (permission_key, role),
    CONSTRAINT chk_role_perm_role CHECK (role IN ('ADMIN', 'MANAGER', 'STAFF')),
    CONSTRAINT chk_role_perm_level CHECK (access_level IN ('NONE', 'ALLOW', 'OWN'))
);

CREATE TABLE IF NOT EXISTS change_logs (
    id              BIGSERIAL PRIMARY KEY,
    category        VARCHAR(60) NOT NULL,
    action          VARCHAR(60) NOT NULL,
    summary         VARCHAR(500) NOT NULL,
    detail          TEXT,
    actor           VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_logs_created ON change_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS system_logs (
    id              BIGSERIAL PRIMARY KEY,
    level           VARCHAR(20) NOT NULL DEFAULT 'INFO',
    source          VARCHAR(80) NOT NULL,
    message         VARCHAR(1000) NOT NULL,
    detail          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_system_log_level CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG'))
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs (created_at DESC);

-- Seed default role permissions
INSERT INTO role_permissions (permission_key, role, access_level) VALUES
('DASHBOARD_VIEW', 'ADMIN', 'ALLOW'),
('DASHBOARD_VIEW', 'MANAGER', 'ALLOW'),
('DASHBOARD_VIEW', 'STAFF', 'ALLOW'),
('CRM_VIEW', 'ADMIN', 'ALLOW'),
('CRM_VIEW', 'MANAGER', 'ALLOW'),
('CRM_VIEW', 'STAFF', 'ALLOW'),
('CRM_EDIT', 'ADMIN', 'ALLOW'),
('CRM_EDIT', 'MANAGER', 'ALLOW'),
('CRM_EDIT', 'STAFF', 'OWN'),
('CRM_EXPORT', 'ADMIN', 'ALLOW'),
('CRM_EXPORT', 'MANAGER', 'ALLOW'),
('CRM_EXPORT', 'STAFF', 'NONE'),
('PERFORMANCE_VIEW', 'ADMIN', 'ALLOW'),
('PERFORMANCE_VIEW', 'MANAGER', 'ALLOW'),
('PERFORMANCE_VIEW', 'STAFF', 'ALLOW'),
('PERFORMANCE_EDIT_TARGET', 'ADMIN', 'ALLOW'),
('PERFORMANCE_EDIT_TARGET', 'MANAGER', 'ALLOW'),
('PERFORMANCE_EDIT_TARGET', 'STAFF', 'NONE'),
('REPORT_VIEW', 'ADMIN', 'ALLOW'),
('REPORT_VIEW', 'MANAGER', 'ALLOW'),
('REPORT_VIEW', 'STAFF', 'ALLOW'),
('BRANCH_ALL', 'ADMIN', 'ALLOW'),
('BRANCH_ALL', 'MANAGER', 'NONE'),
('BRANCH_ALL', 'STAFF', 'NONE'),
('USERS_MANAGE', 'ADMIN', 'ALLOW'),
('USERS_MANAGE', 'MANAGER', 'NONE'),
('USERS_MANAGE', 'STAFF', 'NONE'),
('PERMISSIONS_MANAGE', 'ADMIN', 'ALLOW'),
('PERMISSIONS_MANAGE', 'MANAGER', 'NONE'),
('PERMISSIONS_MANAGE', 'STAFF', 'NONE'),
('BACKUP_MANAGE', 'ADMIN', 'ALLOW'),
('BACKUP_MANAGE', 'MANAGER', 'NONE'),
('BACKUP_MANAGE', 'STAFF', 'NONE'),
('SETTINGS_APPEARANCE', 'ADMIN', 'ALLOW'),
('SETTINGS_APPEARANCE', 'MANAGER', 'ALLOW'),
('SETTINGS_APPEARANCE', 'STAFF', 'ALLOW'),
('SETTINGS_GENERAL', 'ADMIN', 'ALLOW'),
('SETTINGS_GENERAL', 'MANAGER', 'NONE'),
('SETTINGS_GENERAL', 'STAFF', 'NONE'),
('CHANGE_LOGS_VIEW', 'ADMIN', 'ALLOW'),
('CHANGE_LOGS_VIEW', 'MANAGER', 'NONE'),
('CHANGE_LOGS_VIEW', 'STAFF', 'NONE'),
('SYSTEM_LOGS_VIEW', 'ADMIN', 'ALLOW'),
('SYSTEM_LOGS_VIEW', 'MANAGER', 'NONE'),
('SYSTEM_LOGS_VIEW', 'STAFF', 'NONE')
ON CONFLICT (permission_key, role) DO NOTHING;
