-- Backup settings (singleton row id = 1) and backup job history

CREATE TABLE IF NOT EXISTS backup_settings (
    id              BIGINT PRIMARY KEY,
    auto_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    frequency       VARCHAR(20) NOT NULL DEFAULT 'DAILY',
    time_of_day     TIME NOT NULL DEFAULT TIME '02:00:00',
    retain_days     INT NOT NULL DEFAULT 30,
    last_auto_run_at TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120),
    CONSTRAINT chk_backup_frequency CHECK (frequency IN ('DAILY', 'WEEKLY'))
);

INSERT INTO backup_settings (id, auto_enabled, frequency, time_of_day, retain_days)
VALUES (1, FALSE, 'DAILY', TIME '02:00:00', 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS backup_jobs (
    id              BIGSERIAL PRIMARY KEY,
    job_type        VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    filename        VARCHAR(260),
    size_bytes      BIGINT,
    record_count    INT,
    error_message   VARCHAR(1000),
    triggered_by    VARCHAR(120),
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(120),
    updated_by      VARCHAR(120),
    CONSTRAINT chk_backup_job_type CHECK (job_type IN ('MANUAL', 'AUTO')),
    CONSTRAINT chk_backup_job_status CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_at ON backup_jobs (created_at DESC);
