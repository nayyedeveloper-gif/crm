-- =====================================================================
-- Sample CRM history rows (mirrors the design screenshots).
-- Safe to delete in production; kept for demo / UAT.
-- =====================================================================

INSERT INTO crm_history (branch_id, customer_name, phone, birthday, amount, action_type,
                         region_id, township_id, address, remark, created_by, updated_by)
SELECT b.id, v.customer_name, v.phone, v.birthday, v.amount, v.action_type,
       r.id, NULL, v.address, v.remark, v.created_by, v.created_by
FROM (VALUES
    ('SHOP-03', 'Daw Zin Mar Win',  '09-449072746', NULL::date,             61406500.00, 'PURCHASE', NULL,     NULL, 'လာလို့ရရင် လာခဲ့မယ်ညီမလေး။',       'ဆိုင်အမှတ်(၃) Staff'),
    ('SHOP-02', 'Ma Zin Mar Htun',  '09899110220',  NULL,                   1599000.00,  'PURCHASE', NULL,     NULL, 'ဖုန်းဆက်ပါဦး',                     'ဘာဘဲ'),
    ('SHOP-02', 'Ko Naing Gyi',      '09976530823',  NULL,                   1599000.00,  'INQUIRY',  NULL,     NULL, 'ဖုန်းဆက်ပါ',                       'ဘာဘဲ'),
    ('SHOP-02', 'နီနီရယ်နိ',          '09941384445',  NULL,                   1599000.00,  'FOLLOW_UP',NULL,     NULL, 'ဆေး မရလို့ရှင့်',                   'ဘာဘဲ'),
    ('SHOP-03', 'Daw Thandar',       '09-777432033', NULL,                   61925500.00, 'PURCHASE', NULL,     NULL, 'ဖုန်းဆက်ပါ။',                      'ဆိုင်အမှတ်(၃) Staff'),
    ('SHOP-02', 'Ma Zin Mar Thein',  '09779401287',  DATE '1996-01-19',      160500.00,   'PURCHASE', 'MMR006', NULL, 'ရန်ကုန်ဆိုင်တော့မတက်ဖြစ်လောက်ပါဘူး', 'ဘာဘဲ'),
    ('SHOP-02', 'Wai Mar Hnin',      '09963619888',  DATE '2019-02-12',      1610000.00,  'PURCHASE', 'MMR006', NULL, 'မတက်ဖြစ်လောက်ပါဘူး',               'ဘာဘဲ'),
    ('SHOP-03', 'Daw Aye Thidar',    '09-250182301', NULL,                   62354000.00, 'PURCHASE', NULL,     NULL, 'အားလုံး မာတော့တူး ညီမလေး',          'ဆိုင်အမှတ်(၃) Staff'),
    ('SHOP-02', 'Ma Myint Myint Than','09975962321', NULL,                   1614500.00,  'INQUIRY',  NULL,     NULL, 'ဖုန်းဆက်ပါ',                       'ဘာဘဲ'),
    ('SHOP-01', 'Ma Khin Thet Phyo', '09675347858',  DATE '1999-05-15',      1614500.00,  'PURCHASE', 'MMR006', NULL, 'ရန်ကုန်လောက်ဆိုတက်ဖြစ်ပါရှင်',       'ဘာဘဲ')
) AS v(branch_code, customer_name, phone, birthday, amount, action_type, region_code, address, remark, created_by)
JOIN branches b ON b.code = v.branch_code
LEFT JOIN regions r ON r.code = v.region_code;
