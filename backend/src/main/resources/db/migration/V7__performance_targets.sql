-- =====================================================================
-- Staff performance targets (per created_by + amount bucket).
-- Amount buckets use သိန်း units (amount / 100_000).
-- =====================================================================

CREATE TABLE staff_performance_targets (
    id           BIGSERIAL PRIMARY KEY,
    version      BIGINT        NOT NULL DEFAULT 0,
    branch_id    BIGINT,
    staff_key    VARCHAR(120)  NOT NULL,
    bucket_code  VARCHAR(20)   NOT NULL,
    target_count INTEGER       NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by   VARCHAR(120),
    updated_by   VARCHAR(120),
    CONSTRAINT fk_perf_target_branch FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT chk_bucket_code CHECK (bucket_code IN (
        'B_50_100', 'B_100_300', 'B_300_500', 'B_500_1000', 'B_1000_PLUS', 'OTHER'
    ))
);

-- COALESCE so NULL branch_id (HQ / all-branch targets) is unique too
CREATE UNIQUE INDEX uk_perf_target
    ON staff_performance_targets (COALESCE(branch_id, 0), staff_key, bucket_code);
CREATE INDEX idx_perf_target_staff ON staff_performance_targets (staff_key);
CREATE INDEX idx_perf_target_branch ON staff_performance_targets (branch_id);

-- Sample targets for seeded staff names (branch-agnostic: branch_id NULL = global/HQ)
INSERT INTO staff_performance_targets (branch_id, staff_key, bucket_code, target_count, created_by, updated_by)
VALUES
    (NULL, 'ဆိုင်အမှတ်(၃) Staff', 'B_50_100',   10, 'system', 'system'),
    (NULL, 'ဆိုင်အမှတ်(၃) Staff', 'B_100_300',  20, 'system', 'system'),
    (NULL, 'ဆိုင်အမှတ်(၃) Staff', 'B_300_500',  15, 'system', 'system'),
    (NULL, 'ဆိုင်အမှတ်(၃) Staff', 'B_500_1000', 25, 'system', 'system'),
    (NULL, 'ဆိုင်အမှတ်(၃) Staff', 'B_1000_PLUS',10, 'system', 'system'),
    (NULL, 'ဆိုင်အမှတ်(၃) Staff', 'OTHER',      5,  'system', 'system'),
    (NULL, 'ဘာဘဲ',               'B_50_100',   8,  'system', 'system'),
    (NULL, 'ဘာဘဲ',               'B_100_300',  15, 'system', 'system'),
    (NULL, 'ဘာဘဲ',               'B_300_500',  10, 'system', 'system'),
    (NULL, 'ဘာဘဲ',               'B_500_1000', 12, 'system', 'system'),
    (NULL, 'ဘာဘဲ',               'B_1000_PLUS',5,  'system', 'system'),
    (NULL, 'ဘာဘဲ',               'OTHER',      20, 'system', 'system');
