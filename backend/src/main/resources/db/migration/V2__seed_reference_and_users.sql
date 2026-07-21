-- =====================================================================
-- Seed data: 10 branches, users, Myanmar regions/townships.
-- Default password for every seeded user is: Password@123
-- (BCrypt hash below). CHANGE THESE IN PRODUCTION.
-- =====================================================================

-- ---------- Branches (10 shops) ----------
INSERT INTO branches (code, name, phone, address, active, created_by, updated_by) VALUES
    ('SHOP-01', 'ဆိုင်အမှတ်(၁)',  '09-450000001', 'ရန်ကုန်',   TRUE, 'system', 'system'),
    ('SHOP-02', 'ဆိုင်အမှတ်(၂)',  '09-450000002', 'ရန်ကုန်',   TRUE, 'system', 'system'),
    ('SHOP-03', 'ဆိုင်အမှတ်(၃)',  '09-450000003', 'မန္တလေး',   TRUE, 'system', 'system'),
    ('SHOP-04', 'ဆိုင်အမှတ်(၄)',  '09-450000004', 'မန္တလေး',   TRUE, 'system', 'system'),
    ('SHOP-05', 'ဆိုင်အမှတ်(၅)',  '09-450000005', 'နေပြည်တော်', TRUE, 'system', 'system'),
    ('SHOP-06', 'ဆိုင်အမှတ်(၆)',  '09-450000006', 'ပဲခူး',     TRUE, 'system', 'system'),
    ('SHOP-07', 'ဆိုင်အမှတ်(၇)',  '09-450000007', 'မကွေး',     TRUE, 'system', 'system'),
    ('SHOP-08', 'ဆိုင်အမှတ်(၈)',  '09-450000008', 'ဧရာဝတီ',    TRUE, 'system', 'system'),
    ('SHOP-09', 'ဆိုင်အမှတ်(၉)',  '09-450000009', 'တောင်ကြီး', TRUE, 'system', 'system'),
    ('SHOP-10', 'ဆိုင်အမှတ်(၁၀)', '09-450000010', 'မော်လမြိုင်', TRUE, 'system', 'system');

-- ---------- Regions / States ----------
INSERT INTO regions (code, name_mm, name_en, sort_order) VALUES
    ('MMR001', 'စစ်ကိုင်းတိုင်းဒေသကြီး', 'Sagaing',     1),
    ('MMR002', 'တနင်္သာရီတိုင်းဒေသကြီး', 'Tanintharyi', 2),
    ('MMR003', 'ပဲခူးတိုင်းဒေသကြီး',     'Bago',        3),
    ('MMR004', 'မကွေးတိုင်းဒေသကြီး',     'Magway',      4),
    ('MMR005', 'မန္တလေးတိုင်းဒေသကြီး',   'Mandalay',    5),
    ('MMR006', 'ရန်ကုန်တိုင်းဒေသကြီး',   'Yangon',      6),
    ('MMR007', 'ဧရာဝတီတိုင်းဒေသကြီး',   'Ayeyarwady',  7),
    ('MMR008', 'ကချင်ပြည်နယ်',          'Kachin',      8),
    ('MMR009', 'ကယားပြည်နယ်',          'Kayah',       9),
    ('MMR010', 'ကရင်ပြည်နယ်',          'Kayin',       10),
    ('MMR011', 'ချင်းပြည်နယ်',          'Chin',        11),
    ('MMR012', 'မွန်ပြည်နယ်',           'Mon',         12),
    ('MMR013', 'ရခိုင်ပြည်နယ်',          'Rakhine',     13),
    ('MMR014', 'ရှမ်းပြည်နယ်',          'Shan',        14),
    ('MMR015', 'နေပြည်တော်',            'Naypyitaw',   15);

-- ---------- Townships (subset; extend as needed) ----------
INSERT INTO townships (region_id, name_mm, name_en, sort_order)
SELECT id, t.name_mm, t.name_en, t.sort_order
FROM regions r
JOIN (VALUES
    ('MMR006', 'လှိုင်',        'Hlaing',       1),
    ('MMR006', 'ကမာရွတ်',      'Kamaryut',     2),
    ('MMR006', 'စမ်းချောင်း',   'Sanchaung',    3),
    ('MMR006', 'မရမ်းကုန်း',    'Mayangone',    4),
    ('MMR006', 'အင်းစိန်',      'Insein',       5),
    ('MMR006', 'ဗဟန်း',        'Bahan',        6),
    ('MMR005', 'ချမ်းအေးသာစံ',  'Chanayethazan',1),
    ('MMR005', 'မဟာအောင်မြေ',  'Mahaaungmye',  2),
    ('MMR005', 'အမရပူရ',       'Amarapura',    3),
    ('MMR003', 'ပဲခူး',         'Bago',         1),
    ('MMR004', 'မကွေး',         'Magway',       1),
    ('MMR012', 'မော်လမြိုင်',    'Mawlamyine',   1)
) AS t(region_code, name_mm, name_en, sort_order) ON r.code = t.region_code;

-- ---------- Users ----------
-- Admin (HQ, cross-branch)
INSERT INTO users (username, password_hash, full_name, role, branch_id, active, created_by, updated_by)
VALUES ('admin', '$2a$10$9LRD57bdzZora0BRZG8YZePecHEuvFvsOUT.gcSJAgB4B.yppka6W',
        'စီမံခန့်ခွဲသူ အုပ်ချုပ်ရေးမှူး', 'ADMIN', NULL, TRUE, 'system', 'system');

-- One MANAGER and one STAFF per branch
INSERT INTO users (username, password_hash, full_name, role, branch_id, active, created_by, updated_by)
SELECT 'mgr' || substring(b.code from 6),
       '$2a$10$9LRD57bdzZora0BRZG8YZePecHEuvFvsOUT.gcSJAgB4B.yppka6W',
       b.name || ' Manager', 'MANAGER', b.id, TRUE, 'system', 'system'
FROM branches b;

INSERT INTO users (username, password_hash, full_name, role, branch_id, active, created_by, updated_by)
SELECT 'staff' || substring(b.code from 6),
       '$2a$10$9LRD57bdzZora0BRZG8YZePecHEuvFvsOUT.gcSJAgB4B.yppka6W',
       b.name || ' Staff', 'STAFF', b.id, TRUE, 'system', 'system'
FROM branches b;
