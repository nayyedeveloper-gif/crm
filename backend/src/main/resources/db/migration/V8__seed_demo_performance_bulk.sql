-- =====================================================================
-- Bulk demo CRM history + staff performance targets (systematic, no FE hardcode).
-- Generates ~500 history rows across all 10 branches, all amount buckets (သိန်း),
-- regions/townships, and staff created_by keys — enough to render Performance UI.
-- Idempotent: skips insert when bulk demo marker already present.
-- =====================================================================

DO $$
DECLARE
    already BIGINT;
BEGIN
    SELECT COUNT(*) INTO already
    FROM crm_history
    WHERE remark = '[DEMO-BULK]';

    IF already > 0 THEN
        RAISE NOTICE 'V8 demo bulk already present (% rows) — skipping', already;
        RETURN;
    END IF;

    -- ------------------------------------------------------------------
    -- 1) CRM history: 480 rows via generate_series
    --    Bucket mix (approx screenshot ratios):
    --      OTHER 29% | 50-100 6% | 100-300 15% | 300-500 7% | 500-1000 30% | 1000+ 13%
    --    Amount = သိန်း * 100000 (matches AmountBucket in backend)
    -- ------------------------------------------------------------------
    INSERT INTO crm_history (
        branch_id, customer_name, phone, birthday, amount, action_type,
        region_id, township_id, address, remark,
        created_at, updated_at, created_by, updated_by, version
    )
    SELECT
        b.id,
        format('Demo Customer %s', gs.n),
        format('09%09s', (100000000 + gs.n)::text),
        CASE WHEN gs.n % 5 = 0 THEN DATE '1990-01-01' + ((gs.n % 10000)) ELSE NULL END,
        -- amount in MMK from bucket midpoints in သိန်း
        CASE
            WHEN gs.bucket_slot = 1 THEN (10  + (gs.n % 35))::numeric * 100000   -- OTHER < 50
            WHEN gs.bucket_slot = 2 THEN (55  + (gs.n % 40))::numeric * 100000   -- 50-100
            WHEN gs.bucket_slot = 3 THEN (120 + (gs.n % 160))::numeric * 100000  -- 100-300
            WHEN gs.bucket_slot = 4 THEN (320 + (gs.n % 160))::numeric * 100000  -- 300-500
            WHEN gs.bucket_slot = 5 THEN (550 + (gs.n % 400))::numeric * 100000  -- 500-1000
            ELSE                        (1100 + (gs.n % 900))::numeric * 100000 -- 1000+
        END,
        CASE (gs.n % 5)
            WHEN 0 THEN 'PURCHASE'
            WHEN 1 THEN 'INQUIRY'
            WHEN 2 THEN 'FOLLOW_UP'
            WHEN 3 THEN 'COMPLAINT'
            ELSE 'OTHER'
        END,
        -- always assign a real region + township (no incomplete geo rows)
        r.id,
        (
            SELECT t.id
            FROM townships t
            WHERE t.region_id = r.id
            ORDER BY t.id
            OFFSET (gs.n % GREATEST((SELECT COUNT(*) FROM townships t2 WHERE t2.region_id = r.id), 1))
            LIMIT 1
        ),
        CASE WHEN gs.n % 3 = 0 THEN NULL ELSE format('လိပ်စာ နမူနာ #%s', gs.n) END,
        '[DEMO-BULK]',
        -- spread over last ~120 days
        (now() AT TIME ZONE 'Asia/Yangon')::timestamptz - ((gs.n % 120) || ' days')::interval
            - ((gs.n % 24) || ' hours')::interval,
        (now() AT TIME ZONE 'Asia/Yangon')::timestamptz - ((gs.n % 120) || ' days')::interval,
        -- prefer real staff full_name; fall back to branch-based demo keys
        COALESCE(u.full_name, b.name || ' Staff'),
        COALESCE(u.full_name, b.name || ' Staff'),
        0
    FROM (
        SELECT
            n,
            -- weighted bucket slot 1..6
            CASE
                WHEN n <= 139 THEN 1  -- OTHER ~139
                WHEN n <= 168 THEN 2  -- 50-100 ~29
                WHEN n <= 242 THEN 3  -- 100-300 ~74
                WHEN n <= 275 THEN 4  -- 300-500 ~33
                WHEN n <= 418 THEN 5  -- 500-1000 ~143
                ELSE 6                -- 1000+ ~62  (n=419..480)
            END AS bucket_slot
        FROM generate_series(1, 480) AS n
    ) gs
    -- cycle 10 branches
    JOIN branches b ON b.code = format('SHOP-%s', lpad(((gs.n - 1) % 10 + 1)::text, 2, '0'))
    -- cycle regions for geo distribution
    JOIN LATERAL (
        SELECT reg.id
        FROM regions reg
        ORDER BY reg.sort_order, reg.id
        OFFSET ((gs.n - 1) % (SELECT COUNT(*) FROM regions))
        LIMIT 1
    ) r ON TRUE
    -- attach a STAFF user for that branch when available
    LEFT JOIN LATERAL (
        SELECT usr.full_name
        FROM users usr
        WHERE usr.branch_id = b.id AND usr.role = 'STAFF' AND usr.active = TRUE
        ORDER BY usr.id
        LIMIT 1
    ) u ON TRUE;

    -- Extra named creators matching UI screenshots (Hpa-An, Key, etc.)
    INSERT INTO crm_history (
        branch_id, customer_name, phone, amount, action_type,
        region_id, township_id, remark, created_at, updated_at, created_by, updated_by, version
    )
    SELECT
        b.id,
        format('Named Demo %s-%s', v.staff_key, gs.n),
        format('097%08s', (20000000 + gs.n + v.ord * 1000)::text),
        CASE (gs.n % 6)
            WHEN 0 THEN 8000000::numeric
            WHEN 1 THEN 15000000::numeric
            WHEN 2 THEN 35000000::numeric
            WHEN 3 THEN 45000000::numeric
            WHEN 4 THEN 80000000::numeric
            ELSE 150000000::numeric
        END,
        'PURCHASE',
        r.id,
        (SELECT t.id FROM townships t WHERE t.region_id = r.id ORDER BY t.id LIMIT 1),
        '[DEMO-BULK]',
        now() - ((gs.n % 60) || ' days')::interval,
        now() - ((gs.n % 60) || ' days')::interval,
        v.staff_key,
        v.staff_key,
        0
    FROM (VALUES
        (1, 'Hpa-An'),
        (2, 'ဆိုင်အမှတ်(၂) Key'),
        (3, 'ဆိုင်အမှတ်(၃) Staff'),
        (4, 'ဘာဘဲ'),
        (5, 'ဆိုင်အမှတ်(၁) Staff'),
        (6, 'ဆိုင်အမှတ်(၄) Staff'),
        (7, 'ဆိုင်အမှတ်(၅) Staff'),
        (8, 'ဆိုင်အမှတ်(၆) Staff'),
        (9, 'ဆိုင်အမှတ်(၇) Staff'),
        (10, 'ဆိုင်အမှတ်(၈) Staff'),
        (11, 'ဆိုင်အမှတ်(၉) Staff'),
        (12, 'ဆိုင်အမှတ်(၁၀) Staff')
    ) AS v(ord, staff_key)
    CROSS JOIN generate_series(1, 12) AS gs(n)
    JOIN branches b ON b.code = format('SHOP-%s', lpad(((v.ord - 1) % 10 + 1)::text, 2, '0'))
    JOIN LATERAL (
        SELECT reg.id FROM regions reg ORDER BY reg.sort_order OFFSET ((v.ord + gs.n) % (SELECT COUNT(*) FROM regions)) LIMIT 1
    ) r ON TRUE;

    -- ------------------------------------------------------------------
    -- 2) Performance targets for every distinct created_by in demo set
    -- ------------------------------------------------------------------
    INSERT INTO staff_performance_targets (branch_id, staff_key, bucket_code, target_count, created_by, updated_by)
    SELECT
        NULL,
        s.staff_key,
        bkt.code,
        -- target roughly proportional to expected volume
        CASE bkt.code
            WHEN 'OTHER'       THEN 15 + (abs(hashtext(s.staff_key)) % 20)
            WHEN 'B_50_100'    THEN 5  + (abs(hashtext(s.staff_key)) % 10)
            WHEN 'B_100_300'   THEN 10 + (abs(hashtext(s.staff_key)) % 15)
            WHEN 'B_300_500'   THEN 8  + (abs(hashtext(s.staff_key)) % 12)
            WHEN 'B_500_1000'  THEN 12 + (abs(hashtext(s.staff_key)) % 18)
            WHEN 'B_1000_PLUS' THEN 6  + (abs(hashtext(s.staff_key)) % 10)
        END,
        'system',
        'system'
    FROM (
        SELECT DISTINCT created_by AS staff_key
        FROM crm_history
        WHERE created_by IS NOT NULL AND created_by <> ''
    ) s
    CROSS JOIN (VALUES
        ('B_50_100'), ('B_100_300'), ('B_300_500'),
        ('B_500_1000'), ('B_1000_PLUS'), ('OTHER')
    ) AS bkt(code)
    WHERE NOT EXISTS (
        SELECT 1
        FROM staff_performance_targets t
        WHERE t.staff_key = s.staff_key
          AND t.bucket_code = bkt.code
          AND t.branch_id IS NULL
    );

    RAISE NOTICE 'V8 demo bulk seeded successfully';
END $$;
