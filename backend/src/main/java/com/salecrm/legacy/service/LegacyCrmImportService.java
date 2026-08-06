package com.salecrm.legacy.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.InviteStatus;
import com.salecrm.legacy.dto.LegacyCrmImportResult;
import com.salecrm.location.entity.Region;
import com.salecrm.location.repository.RegionRepository;
import com.salecrm.performance.AmountBucket;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Copies Laravel CRM tables into Sale-CRM PostgreSQL.
 * Requires {@code app.legacy-mysql.enabled=true}.
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.legacy-mysql", name = "enabled", havingValue = "true")
public class LegacyCrmImportService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Yangon");
    private static final int BATCH = 500;

    /** Laravel region name fragment → Sale-CRM region code. */
    private static final Map<String, String> REGION_CODE_BY_LEGACY_HINT = Map.ofEntries(
            Map.entry("နေပြည်တော်", "MMR015"),
            Map.entry("ကချင်", "MMR008"),
            Map.entry("ကယား", "MMR009"),
            Map.entry("ကရင်", "MMR010"),
            Map.entry("ချင်း", "MMR011"),
            Map.entry("စစ်ကိုင်း", "MMR001"),
            Map.entry("တနင်္သာရီ", "MMR002"),
            Map.entry("ပဲခူး", "MMR003"),
            Map.entry("မကွေး", "MMR004"),
            Map.entry("မန္တလေး", "MMR005"),
            Map.entry("မွန်", "MMR012"),
            Map.entry("ရခိုင်", "MMR013"),
            Map.entry("ရန်ကုန်", "MMR006"),
            Map.entry("ရှမ်း", "MMR014"),
            Map.entry("ဧရာဝတီ", "MMR007")
    );

    private final NamedParameterJdbcTemplate legacyJdbc;
    private final NamedParameterJdbcTemplate pgJdbc;
    private final BranchRepository branchRepository;
    private final RegionRepository regionRepository;

    public LegacyCrmImportService(
            @Qualifier("legacyJdbcTemplate") NamedParameterJdbcTemplate legacyJdbc,
            DataSource dataSource,
            BranchRepository branchRepository,
            RegionRepository regionRepository
    ) {
        this.legacyJdbc = legacyJdbc;
        this.pgJdbc = new NamedParameterJdbcTemplate(dataSource);
        this.branchRepository = branchRepository;
        this.regionRepository = regionRepository;
    }

    @Transactional
    public LegacyCrmImportResult importAll(boolean replaceLegacyRows) {
        Map<Long, Long> branchMap = buildBranchMap();
        Map<Long, Long> regionMap = buildRegionMap();
        Map<String, Long> townshipMap = buildTownshipMap();
        Map<Long, String> userNames = loadLegacyUserNames();

        Long legacyCount = legacyJdbc.getJdbcTemplate()
                .queryForObject("SELECT COUNT(*) FROM crm_histories", Long.class);
        long sourceCount = legacyCount == null ? 0 : legacyCount;

        if (replaceLegacyRows) {
            pgJdbc.getJdbcTemplate().update("DELETE FROM crm_history WHERE legacy_id IS NOT NULL");
        }

        long imported = 0;
        long skipped = 0;
        long lastId = 0;

        while (true) {
            List<Map<String, Object>> rows = legacyJdbc.query(
                    """
                            SELECT * FROM crm_histories
                            WHERE id > :lastId
                            ORDER BY id ASC
                            LIMIT :limit
                            """,
                    new MapSqlParameterSource()
                            .addValue("lastId", lastId)
                            .addValue("limit", BATCH),
                    (rs, i) -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        var meta = rs.getMetaData();
                        for (int c = 1; c <= meta.getColumnCount(); c++) {
                            m.put(meta.getColumnLabel(c), rs.getObject(c));
                        }
                        return m;
                    }
            );
            if (rows.isEmpty()) {
                break;
            }

            for (Map<String, Object> row : rows) {
                long legacyId = ((Number) row.get("id")).longValue();
                lastId = legacyId;
                Long branchId = branchMap.get(toLong(row.get("branch_id")));
                if (branchId == null) {
                    skipped++;
                    log.warn("Skip CRM legacy_id={} unknown branch_id={}", legacyId, row.get("branch_id"));
                    continue;
                }

                InviteStatus invite = InviteStatus.fromLegacy(asString(row.get("invite_status")));
                ActionType action = invite != null ? invite.toActionType() : ActionType.OTHER;

                Long regionId = regionMap.get(toLong(row.get("region_id")));
                Long townshipId = resolveTownshipId(
                        regionId,
                        toLong(row.get("township_id")),
                        townshipMap
                );

                String createdBy = userNames.getOrDefault(toLong(row.get("created_by")), "legacy");
                Long legacyCreatedByUserId = toLong(row.get("created_by"));
                Instant createdAt = toInstant(row.get("created_at"));
                Instant updatedAt = toInstant(row.get("updated_at"));
                if (createdAt == null) {
                    createdAt = Instant.now();
                }
                if (updatedAt == null) {
                    updatedAt = createdAt;
                }

                MapSqlParameterSource params = new MapSqlParameterSource()
                        .addValue("legacyId", legacyId)
                        .addValue("legacyCreatedByUserId", legacyCreatedByUserId)
                        .addValue("branchId", branchId)
                        .addValue("customerName", truncate(asString(row.get("customer_name")), 160))
                        .addValue("phone", truncate(asString(row.get("phone_number")), 40))
                        .addValue("birthday", toSqlDate(row.get("date_of_birth")))
                        .addValue("amount", toDecimal(row.get("amount")))
                        .addValue("actionType", action.name())
                        .addValue("inviteStatus", invite != null ? invite.name() : null)
                        .addValue("customerCondition", truncate(asString(row.get("customer_condition")), 120))
                        .addValue("regionId", regionId)
                        .addValue("townshipId", townshipId)
                        .addValue("nrc", truncate(composeNrc(row), 30))
                        .addValue("address", truncate(asString(row.get("address")), 400))
                        .addValue("remark", truncate(asString(row.get("remark")), 1000))
                        .addValue("createdAt", Timestamp.from(createdAt))
                        .addValue("updatedAt", Timestamp.from(updatedAt))
                        .addValue("createdBy", truncate(createdBy, 120))
                        .addValue("updatedBy", truncate(createdBy, 120));

                int n = pgJdbc.update("""
                        INSERT INTO crm_history (
                            version, branch_id, customer_name, phone, birthday, amount, action_type,
                            invite_status, customer_condition, region_id, township_id, nrc, address, remark,
                            legacy_id, legacy_created_by_user_id, created_at, updated_at, created_by, updated_by
                        ) VALUES (
                            0, :branchId, :customerName, :phone, :birthday, :amount, :actionType,
                            :inviteStatus, :customerCondition, :regionId, :townshipId, :nrc, :address, :remark,
                            :legacyId, :legacyCreatedByUserId, :createdAt, :updatedAt, :createdBy, :updatedBy
                        )
                        ON CONFLICT (legacy_id) DO UPDATE SET
                            branch_id = EXCLUDED.branch_id,
                            customer_name = EXCLUDED.customer_name,
                            phone = EXCLUDED.phone,
                            birthday = EXCLUDED.birthday,
                            amount = EXCLUDED.amount,
                            action_type = EXCLUDED.action_type,
                            invite_status = EXCLUDED.invite_status,
                            customer_condition = EXCLUDED.customer_condition,
                            region_id = EXCLUDED.region_id,
                            township_id = EXCLUDED.township_id,
                            nrc = EXCLUDED.nrc,
                            address = EXCLUDED.address,
                            remark = EXCLUDED.remark,
                            legacy_created_by_user_id = EXCLUDED.legacy_created_by_user_id,
                            updated_at = EXCLUDED.updated_at,
                            updated_by = EXCLUDED.updated_by,
                            version = crm_history.version + 1
                        """, params);
                imported += n;
            }
            log.info("CRM import progress lastId={} imported={}", lastId, imported);
        }

        long targets = importPerformanceTargets(branchMap, userNames);
        long interactions = importCustomerInteractions(branchMap, userNames);

        // Remove seeded demo rows that are not from legacy (optional cleanliness when replacing)
        if (replaceLegacyRows) {
            pgJdbc.getJdbcTemplate().update(
                    "DELETE FROM crm_history WHERE legacy_id IS NULL AND created_by IN ('system', 'seed', 'demo')"
            );
        }

        String msg = "Imported CRM from Laravel shop_sales into PostgreSQL";
        return new LegacyCrmImportResult(
                sourceCount, imported, skipped, targets, interactions, replaceLegacyRows, msg);
    }

    private long importPerformanceTargets(Map<Long, Long> branchMap, Map<Long, String> userNames) {
        List<Map<String, Object>> rows = legacyJdbc.query(
                "SELECT * FROM crm_staff_performance_targets",
                Map.of(),
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    var meta = rs.getMetaData();
                    for (int c = 1; c <= meta.getColumnCount(); c++) {
                        m.put(meta.getColumnLabel(c), rs.getObject(c));
                    }
                    return m;
                }
        );

        // Clear previous legacy-imported targets tagged by updated_by
        pgJdbc.getJdbcTemplate().update(
                "DELETE FROM staff_performance_targets WHERE created_by = 'legacy-import'");

        long count = 0;
        for (Map<String, Object> row : rows) {
            Long legacyUserId = toLong(row.get("user_id"));
            String staffKey = userNames.getOrDefault(legacyUserId, "user-" + legacyUserId);
            Long legacyBranchId = loadLegacyUserBranch(legacyUserId);
            Long branchId = legacyBranchId == null ? null : branchMap.get(legacyBranchId);

            Map<AmountBucket, Integer> buckets = new EnumMapLike();
            buckets.put(AmountBucket.B_50_100, toInt(row.get("amount_50_to_100")));
            buckets.put(AmountBucket.B_100_300, toInt(row.get("amount_100_to_300")));
            buckets.put(AmountBucket.B_300_500, toInt(row.get("amount_300_to_500")));
            buckets.put(AmountBucket.B_500_1000, toInt(row.get("amount_500_to_1000")));
            buckets.put(AmountBucket.B_1000_PLUS, toInt(row.get("amount_above_1000")));
            buckets.put(AmountBucket.OTHER, toInt(row.get("amount_other")));

            int bucketSum = buckets.values().stream().mapToInt(Integer::intValue).sum();
            int totalTarget = toInt(row.get("total_target"));
            if (bucketSum == 0 && totalTarget > 0) {
                buckets.put(AmountBucket.OTHER, totalTarget);
            }

            for (Map.Entry<AmountBucket, Integer> e : buckets.entrySet()) {
                if (e.getValue() == null || e.getValue() <= 0) {
                    continue;
                }
                MapSqlParameterSource p = new MapSqlParameterSource()
                        .addValue("branchId", branchId)
                        .addValue("staffKey", truncate(staffKey, 120))
                        .addValue("bucket", e.getKey().name())
                        .addValue("target", e.getValue());
                count += pgJdbc.update("""
                        INSERT INTO staff_performance_targets (
                            version, branch_id, staff_key, bucket_code, target_count,
                            created_at, updated_at, created_by, updated_by
                        ) VALUES (
                            0, :branchId, :staffKey, :bucket, :target,
                            now(), now(), 'legacy-import', 'legacy-import'
                        )
                        """, p);
            }
        }
        return count;
    }

    private long importCustomerInteractions(Map<Long, Long> branchMap, Map<Long, String> userNames) {
        // Table is empty today; still support future rows by appending into remark-backed CRM history
        Long n = legacyJdbc.getJdbcTemplate()
                .queryForObject("SELECT COUNT(*) FROM crm_customer_interactions", Long.class);
        if (n == null || n == 0) {
            return 0;
        }
        // No dedicated PG table — store as FOLLOW_UP CRM rows with legacy_id offset marker
        // Use negative legacy space via remark only; skip dedicated import to avoid polluting ids.
        log.info("crm_customer_interactions has {} rows — skipped (no PG table yet)", n);
        return 0;
    }

    private Long loadLegacyUserBranch(Long userId) {
        if (userId == null) {
            return null;
        }
        List<Long> ids = legacyJdbc.query(
                "SELECT branch_id FROM users WHERE id = :id",
                Map.of("id", userId),
                (rs, i) -> {
                    Object v = rs.getObject(1);
                    return v == null ? null : ((Number) v).longValue();
                }
        );
        return ids.isEmpty() ? null : ids.get(0);
    }

    private Map<Long, String> loadLegacyUserNames() {
        Map<Long, String> map = new HashMap<>();
        legacyJdbc.query("SELECT id, name FROM users", Map.of(), rs -> {
            map.put(rs.getLong("id"), rs.getString("name"));
        });
        return map;
    }

    private Map<Long, Long> buildBranchMap() {
        Map<String, Long> byName = new HashMap<>();
        Map<String, Long> byCode = new HashMap<>();
        for (Branch b : branchRepository.findAll()) {
            byName.put(normalize(b.getName()), b.getId());
            byCode.put(b.getCode().toUpperCase(Locale.ROOT), b.getId());
        }
        // Ensure BA-AN
        if (!byCode.containsKey("BA-AN") && !byName.containsKey(normalize("ဘားအံမြို့"))) {
            Branch created = branchRepository.save(Branch.builder()
                    .code("BA-AN")
                    .name("ဘားအံမြို့")
                    .active(true)
                    .build());
            byName.put(normalize(created.getName()), created.getId());
            byCode.put("BA-AN", created.getId());
        }

        Map<Long, Long> legacyToNew = new HashMap<>();
        List<Map<String, Object>> legacyBranches = legacyJdbc.query(
                "SELECT id, name, code FROM branches",
                Map.of(),
                (rs, i) -> Map.of(
                        "id", rs.getLong("id"),
                        "name", rs.getString("name") == null ? "" : rs.getString("name"),
                        "code", rs.getString("code") == null ? "" : rs.getString("code")
                )
        );
        for (Map<String, Object> lb : legacyBranches) {
            long legacyId = ((Number) lb.get("id")).longValue();
            String name = (String) lb.get("name");
            String code = ((String) lb.get("code")).toUpperCase(Locale.ROOT);
            Long mapped = byName.get(normalize(name));
            if (mapped == null && code.matches("S\\d+")) {
                int n = Integer.parseInt(code.substring(1));
                mapped = byCode.get("SHOP-" + String.format("%02d", n));
            }
            if (mapped == null && ("T2".equals(code) || name.contains("ဘားအံ"))) {
                mapped = byCode.get("BA-AN");
            }
            if (mapped != null) {
                legacyToNew.put(legacyId, mapped);
            }
        }
        return legacyToNew;
    }

    private Map<Long, Long> buildRegionMap() {
        Map<String, Long> byCode = new HashMap<>();
        for (Region r : regionRepository.findAll()) {
            byCode.put(r.getCode(), r.getId());
        }
        Map<Long, Long> legacyToNew = new HashMap<>();
        List<Map<String, Object>> legacyRegions = legacyJdbc.query(
                "SELECT id, name FROM regions",
                Map.of(),
                (rs, i) -> Map.of(
                        "id", rs.getLong("id"),
                        "name", rs.getString("name") == null ? "" : rs.getString("name")
                )
        );
        for (Map<String, Object> lr : legacyRegions) {
            long id = ((Number) lr.get("id")).longValue();
            String name = (String) lr.get("name");
            String code = null;
            for (Map.Entry<String, String> e : REGION_CODE_BY_LEGACY_HINT.entrySet()) {
                if (name.contains(e.getKey())) {
                    code = e.getValue();
                    break;
                }
            }
            if (code != null && byCode.containsKey(code)) {
                legacyToNew.put(id, byCode.get(code));
            }
        }
        return legacyToNew;
    }

    /** key = regionId + "|" + normalized township name */
    private Map<String, Long> buildTownshipMap() {
        Map<String, Long> map = new HashMap<>();
        pgJdbc.query("SELECT id, region_id, name_mm FROM townships", Map.of(), rs -> {
            map.put(rs.getLong("region_id") + "|" + normalize(rs.getString("name_mm")), rs.getLong("id"));
        });
        return map;
    }

    private Long resolveTownshipId(Long newRegionId, Long legacyTownshipId, Map<String, Long> townshipMap) {
        if (legacyTownshipId == null || newRegionId == null) {
            return null;
        }
        List<String> names = legacyJdbc.query(
                "SELECT name FROM townships WHERE id = :id",
                Map.of("id", legacyTownshipId),
                (rs, i) -> rs.getString(1)
        );
        if (names.isEmpty() || !StringUtils.hasText(names.get(0))) {
            return null;
        }
        return townshipMap.get(newRegionId + "|" + normalize(names.get(0)));
    }

    private static String composeNrc(Map<String, Object> row) {
        String state = asString(row.get("nrc_state"));
        String township = asString(row.get("nrc_township_code"));
        String type = asString(row.get("nrc_type"));
        String number = asString(row.get("nrc_number"));
        if (!StringUtils.hasText(state) && !StringUtils.hasText(number)) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(state)) {
            sb.append(state.trim());
        }
        if (StringUtils.hasText(township)) {
            if (!sb.isEmpty()) sb.append('/');
            sb.append(township.trim());
        }
        if (StringUtils.hasText(type)) {
            sb.append('(').append(type.trim()).append(')');
        }
        if (StringUtils.hasText(number)) {
            sb.append(number.trim());
        }
        return sb.isEmpty() ? null : sb.toString();
    }

    private static String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static String asString(Object o) {
        return o == null ? null : o.toString();
    }

    private static Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(o.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static int toInt(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(o.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static BigDecimal toDecimal(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal bd) return bd;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(o.toString());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private static Date toSqlDate(Object o) {
        if (o == null) return null;
        if (o instanceof Date d) return d;
        if (o instanceof LocalDate ld) return Date.valueOf(ld);
        if (o instanceof java.util.Date d) return new Date(d.getTime());
        try {
            return Date.valueOf(o.toString().substring(0, 10));
        } catch (Exception e) {
            return null;
        }
    }

    private static Instant toInstant(Object o) {
        if (o == null) return null;
        if (o instanceof Timestamp ts) return ts.toInstant();
        if (o instanceof Instant i) return i;
        if (o instanceof java.util.Date d) return d.toInstant();
        try {
            return Timestamp.valueOf(o.toString()).toInstant();
        } catch (Exception e) {
            try {
                return LocalDate.parse(o.toString().substring(0, 10)).atStartOfDay(ZONE).toInstant();
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() <= max ? t : t.substring(0, max);
    }

    /** Tiny helper avoiding EnumMap constructor noise in loop init. */
    private static final class EnumMapLike extends java.util.EnumMap<AmountBucket, Integer> {
        EnumMapLike() {
            super(AmountBucket.class);
        }
    }
}
