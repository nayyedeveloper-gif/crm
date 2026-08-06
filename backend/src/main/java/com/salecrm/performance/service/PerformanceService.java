package com.salecrm.performance.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ForbiddenBranchAccessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.crmhistory.entity.InviteStatus;
import com.salecrm.location.entity.Region;
import com.salecrm.location.entity.Township;
import com.salecrm.location.repository.RegionRepository;
import com.salecrm.location.repository.TownshipRepository;
import com.salecrm.performance.AmountBucket;
import com.salecrm.performance.dto.*;
import com.salecrm.performance.entity.StaffPerformanceTarget;
import com.salecrm.performance.repository.PerformanceQueryRepository;
import com.salecrm.performance.repository.StaffPerformanceTargetRepository;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import com.salecrm.user.entity.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class PerformanceService {

    private static final String UNKNOWN_REGION = "Region မရှိ";

    private final PerformanceQueryRepository queryRepository;
    private final StaffPerformanceTargetRepository targetRepository;
    private final BranchRepository branchRepository;
    private final RegionRepository regionRepository;
    private final TownshipRepository townshipRepository;

    @Transactional(readOnly = true)
    public StaffPerformanceResponse staffPerformance(PerformanceFilter filter) {
        PerformanceFilter scoped = withScopedBranch(filter);
        List<Object[]> amounts = queryRepository.findStaffAmounts(scoped);

        Map<String, EnumMap<AmountBucket, Integer>> actuals = new LinkedHashMap<>();
        Map<String, EnumMap<AmountBucket, Set<String>>> phones = new LinkedHashMap<>();

        for (Object[] row : amounts) {
            String staffKey = row[0] != null ? row[0].toString() : "Unknown";
            BigDecimal amount = toBigDecimal(row[1]);
            String phone = normalizePhone(row[2]);
            AmountBucket bucket = AmountBucket.fromAmount(amount);
            actuals.computeIfAbsent(staffKey, k -> emptyBucketMap()).merge(bucket, 1, Integer::sum);
            if (phone != null) {
                phones.computeIfAbsent(staffKey, k -> emptyPhoneMap())
                        .computeIfAbsent(bucket, k -> new HashSet<>())
                        .add(phone);
            }
        }

        Map<String, EnumMap<AmountBucket, Integer>> targets = loadTargets(scoped.branchId());
        for (String key : targets.keySet()) {
            actuals.computeIfAbsent(key, k -> emptyBucketMap());
        }

        List<BucketMeta> meta = bucketMeta();
        List<StaffPerformanceRow> rows = actuals.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                .map(e -> toStaffRow(
                        e.getKey(),
                        e.getValue(),
                        phones.getOrDefault(e.getKey(), emptyPhoneMap()),
                        targets.getOrDefault(e.getKey(), emptyBucketMap())))
                .toList();

        return new StaffPerformanceResponse(meta, rows, sumStaffRows(rows));
    }

    @Transactional
    public StaffPerformanceRow upsertTargets(UpdateStaffTargetRequest request) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        if (user.getRole() == Role.STAFF) {
            throw new BusinessException("Only managers and admins can update targets.", HttpStatus.FORBIDDEN);
        }

        Long branchId = resolveBranchId(request.branchId());
        Branch branch = branchId == null ? null : branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", branchId));

        for (Map.Entry<String, Integer> entry : request.targets().entrySet()) {
            AmountBucket bucket;
            try {
                bucket = AmountBucket.fromCode(entry.getKey());
            } catch (IllegalArgumentException ex) {
                continue;
            }
            int value = entry.getValue() == null ? 0 : Math.max(0, entry.getValue());

            StaffPerformanceTarget target = (branchId == null
                    ? targetRepository.findHqExact(request.staffKey(), bucket)
                    : targetRepository.findBranchExact(request.staffKey(), bucket, branchId))
                    .orElseGet(() -> StaffPerformanceTarget.builder()
                            .staffKey(request.staffKey())
                            .bucketCode(bucket)
                            .branch(branch)
                            .build());
            target.setTargetCount(value);
            targetRepository.save(target);
        }

        StaffPerformanceResponse full = staffPerformance(new PerformanceFilter(
                branchId, null, null, null, null, null, null));
        return full.rows().stream()
                .filter(r -> r.staffKey().equals(request.staffKey()))
                .findFirst()
                .orElse(toStaffRow(request.staffKey(), emptyBucketMap(), emptyPhoneMap(), emptyBucketMap()));
    }

    @Transactional(readOnly = true)
    public RegionPerformanceResponse regionPerformance(PerformanceFilter filter) {
        PerformanceFilter scoped = withScopedBranch(filter);
        List<Object[]> amounts = queryRepository.findRegionAmounts(scoped);

        Map<Long, Region> regionMap = regionRepository.findAllByOrderBySortOrderAscNameMmAsc().stream()
                .collect(Collectors.toMap(Region::getId, r -> r, (a, b) -> a, LinkedHashMap::new));
        Map<Long, Township> townshipMap = townshipRepository.findAll().stream()
                .collect(Collectors.toMap(Township::getId, t -> t));

        Map<Long, EnumMap<AmountBucket, Integer>> regionActuals = new LinkedHashMap<>();
        Map<Long, EnumMap<AmountBucket, Set<String>>> regionPhones = new LinkedHashMap<>();
        Map<Long, Map<Long, EnumMap<AmountBucket, Integer>>> townshipActuals = new LinkedHashMap<>();
        Map<Long, Map<Long, EnumMap<AmountBucket, Set<String>>>> townshipPhones = new LinkedHashMap<>();

        for (Object[] row : amounts) {
            Long regionId = row[0] == null ? null : ((Number) row[0]).longValue();
            Long townshipId = row[1] == null ? null : ((Number) row[1]).longValue();
            BigDecimal amount = toBigDecimal(row[2]);
            String phone = normalizePhone(row[3]);
            AmountBucket bucket = AmountBucket.fromAmount(amount);
            Long regionKey = regionId == null ? -1L : regionId;

            regionActuals.computeIfAbsent(regionKey, k -> emptyBucketMap()).merge(bucket, 1, Integer::sum);
            if (phone != null) {
                regionPhones.computeIfAbsent(regionKey, k -> emptyPhoneMap())
                        .computeIfAbsent(bucket, k -> new HashSet<>())
                        .add(phone);
            }

            if (townshipId != null) {
                townshipActuals
                        .computeIfAbsent(regionKey, k -> new LinkedHashMap<>())
                        .computeIfAbsent(townshipId, k -> emptyBucketMap())
                        .merge(bucket, 1, Integer::sum);
                if (phone != null) {
                    townshipPhones
                            .computeIfAbsent(regionKey, k -> new LinkedHashMap<>())
                            .computeIfAbsent(townshipId, k -> emptyPhoneMap())
                            .computeIfAbsent(bucket, k -> new HashSet<>())
                            .add(phone);
                }
            }
        }

        List<BucketMeta> meta = bucketMeta();
        List<RegionPerformanceRow> withData = new ArrayList<>();

        // Region မရှိ first when present
        if (regionActuals.containsKey(-1L)) {
            withData.add(toRegionRow(
                    null,
                    UNKNOWN_REGION,
                    regionActuals.get(-1L),
                    regionPhones.getOrDefault(-1L, emptyPhoneMap()),
                    List.of()));
        }

        for (Region region : regionMap.values()) {
            EnumMap<AmountBucket, Integer> buckets =
                    regionActuals.getOrDefault(region.getId(), emptyBucketMap());
            if (buckets.values().stream().mapToInt(Integer::intValue).sum() == 0) {
                continue;
            }

            Map<Long, EnumMap<AmountBucket, Integer>> twMap =
                    townshipActuals.getOrDefault(region.getId(), Map.of());
            Map<Long, EnumMap<AmountBucket, Set<String>>> twPhoneMap =
                    townshipPhones.getOrDefault(region.getId(), Map.of());

            List<TownshipPerformanceRow> townships = twMap.entrySet().stream()
                    .filter(e -> e.getKey() != null && townshipMap.containsKey(e.getKey()))
                    .sorted(Comparator.comparing(
                            e -> townshipMap.get(e.getKey()).getNameMm(),
                            String.CASE_INSENSITIVE_ORDER))
                    .map(e -> toTownshipRow(
                            e.getKey(),
                            townshipMap.get(e.getKey()).getNameMm(),
                            e.getValue(),
                            twPhoneMap.getOrDefault(e.getKey(), emptyPhoneMap())))
                    .toList();

            withData.add(toRegionRow(
                    region.getId(),
                    region.getNameMm(),
                    buckets,
                    regionPhones.getOrDefault(region.getId(), emptyPhoneMap()),
                    townships));
        }

        withData.sort(Comparator
                .comparing((RegionPerformanceRow r) -> r.regionId() != null)
                .thenComparing(RegionPerformanceRow::totalActual, Comparator.reverseOrder()));
        return new RegionPerformanceResponse(meta, withData, sumRegionRows(withData));
    }

    @Transactional(readOnly = true)
    public StatusPerformanceResponse statusPerformance(PerformanceFilter filter) {
        PerformanceFilter scoped = withScopedBranch(filter);
        List<Object[]> rows = queryRepository.findStaffStatusCounts(scoped);

        List<InviteStatus> statuses = List.of(InviteStatus.values());
        Map<String, EnumMap<InviteStatus, Integer>> byStaff = new LinkedHashMap<>();

        for (Object[] row : rows) {
            String staffKey = row[0] != null ? row[0].toString() : "Unknown";
            InviteStatus status = (InviteStatus) row[1];
            if (status == null) {
                continue;
            }
            byStaff.computeIfAbsent(staffKey, k -> emptyStatusMap()).merge(status, 1, Integer::sum);
        }

        List<String> statusCodes = statuses.stream().map(Enum::name).toList();
        List<StatusPerformanceRow> result = byStaff.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                .map(e -> toStatusRow(e.getKey(), e.getValue(), statuses))
                .sorted(Comparator.comparingInt(StatusPerformanceRow::total).reversed())
                .toList();

        return new StatusPerformanceResponse(statusCodes, result, sumStatusRows(result, statuses));
    }

    @Transactional(readOnly = true)
    public StatusBreakdownResponse statusBreakdown(PerformanceFilter filter) {
        PerformanceFilter scoped = withScopedBranch(filter);
        List<Object[]> amounts = queryRepository.findStatusBreakdownAmounts(scoped);

        Map<InviteStatus, EnumMap<AmountBucket, Integer>> counts = new EnumMap<>(InviteStatus.class);
        Map<InviteStatus, EnumMap<AmountBucket, Set<String>>> phones = new EnumMap<>(InviteStatus.class);

        for (Object[] row : amounts) {
            InviteStatus status = (InviteStatus) row[0];
            if (status == null) {
                continue;
            }
            AmountBucket bucket = AmountBucket.fromAmount(toBigDecimal(row[1]));
            String phone = normalizePhone(row[2]);
            counts.computeIfAbsent(status, k -> emptyBucketMap()).merge(bucket, 1, Integer::sum);
            if (phone != null) {
                phones.computeIfAbsent(status, k -> emptyPhoneMap())
                        .computeIfAbsent(bucket, k -> new HashSet<>())
                        .add(phone);
            }
        }

        List<BucketMeta> meta = bucketMeta();
        List<StatusBreakdownRow> rows = new ArrayList<>();
        for (InviteStatus status : InviteStatus.values()) {
            EnumMap<AmountBucket, Integer> bucketCounts = counts.getOrDefault(status, emptyBucketMap());
            if (bucketCounts.values().stream().mapToInt(Integer::intValue).sum() == 0
                    && !counts.containsKey(status)) {
                // still include empty statuses for consistent columns
            }
            rows.add(toBreakdownRow(
                    status,
                    bucketCounts,
                    phones.getOrDefault(status, emptyPhoneMap())));
        }

        return new StatusBreakdownResponse(meta, rows, sumBreakdownRows(rows));
    }

    // ---- helpers ----

    private PerformanceFilter withScopedBranch(PerformanceFilter filter) {
        Long scopedBranch = resolveBranchId(filter == null ? null : filter.branchId());
        if (filter == null) {
            return new PerformanceFilter(scopedBranch, null, null, null, null, null, null);
        }
        return new PerformanceFilter(
                scopedBranch,
                filter.actionType(),
                filter.inviteStatus(),
                filter.regionId(),
                filter.townshipId(),
                filter.from(),
                filter.to());
    }

    private Long resolveBranchId(Long requested) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        if (user.isCrossBranch()) {
            return requested;
        }
        if (requested != null && !requested.equals(user.getBranchId())) {
            throw new ForbiddenBranchAccessException();
        }
        return user.getBranchId();
    }

    private Map<String, EnumMap<AmountBucket, Integer>> loadTargets(Long branchId) {
        Map<String, EnumMap<AmountBucket, Integer>> map = new HashMap<>();

        for (StaffPerformanceTarget t : targetRepository.findHeadquartersTargets()) {
            map.computeIfAbsent(t.getStaffKey(), k -> emptyBucketMap())
                    .put(t.getBucketCode(), t.getTargetCount());
        }
        if (branchId != null) {
            for (StaffPerformanceTarget t : targetRepository.findByBranchId(branchId)) {
                map.computeIfAbsent(t.getStaffKey(), k -> emptyBucketMap())
                        .put(t.getBucketCode(), t.getTargetCount());
            }
        }
        return map;
    }

    private static EnumMap<AmountBucket, Integer> emptyBucketMap() {
        EnumMap<AmountBucket, Integer> map = new EnumMap<>(AmountBucket.class);
        for (AmountBucket b : AmountBucket.ordered()) {
            map.put(b, 0);
        }
        return map;
    }

    private static EnumMap<AmountBucket, Set<String>> emptyPhoneMap() {
        return new EnumMap<>(AmountBucket.class);
    }

    private static EnumMap<InviteStatus, Integer> emptyStatusMap() {
        EnumMap<InviteStatus, Integer> map = new EnumMap<>(InviteStatus.class);
        for (InviteStatus s : InviteStatus.values()) {
            map.put(s, 0);
        }
        return map;
    }

    private static List<BucketMeta> bucketMeta() {
        return AmountBucket.ordered().stream()
                .map(b -> new BucketMeta(b.code(), b.labelMm()))
                .toList();
    }

    private static String normalizePhone(Object raw) {
        if (raw == null) {
            return null;
        }
        String phone = raw.toString().trim();
        return phone.isEmpty() ? null : phone;
    }

    private static int uniqueCount(EnumMap<AmountBucket, Set<String>> phones, AmountBucket bucket) {
        Set<String> set = phones.get(bucket);
        return set == null ? 0 : set.size();
    }

    private static int uniqueTotal(EnumMap<AmountBucket, Set<String>> phones) {
        Set<String> all = new HashSet<>();
        for (Set<String> set : phones.values()) {
            if (set != null) {
                all.addAll(set);
            }
        }
        return all.size();
    }

    private static StaffPerformanceRow toStaffRow(
            String staffKey,
            EnumMap<AmountBucket, Integer> actual,
            EnumMap<AmountBucket, Set<String>> phones,
            EnumMap<AmountBucket, Integer> target) {
        Map<String, BucketCounts> buckets = new LinkedHashMap<>();
        int totalTarget = 0;
        int totalActual = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int t = target.getOrDefault(b, 0);
            int a = actual.getOrDefault(b, 0);
            int u = uniqueCount(phones, b);
            buckets.put(b.code(), new BucketCounts(t, a, u));
            totalTarget += t;
            totalActual += a;
        }
        return new StaffPerformanceRow(staffKey, totalTarget, totalActual, uniqueTotal(phones), buckets);
    }

    private static StaffPerformanceRow sumStaffRows(List<StaffPerformanceRow> rows) {
        EnumMap<AmountBucket, Integer> actual = emptyBucketMap();
        EnumMap<AmountBucket, Integer> target = emptyBucketMap();
        EnumMap<AmountBucket, Integer> unique = emptyBucketMap();
        int totalUnique = 0;
        for (StaffPerformanceRow row : rows) {
            totalUnique += row.totalUniquePhones();
            for (AmountBucket b : AmountBucket.ordered()) {
                BucketCounts c = row.buckets().get(b.code());
                if (c != null) {
                    actual.merge(b, c.actual(), Integer::sum);
                    target.merge(b, c.target(), Integer::sum);
                    unique.merge(b, c.uniquePhones(), Integer::sum);
                }
            }
        }
        Map<String, BucketCounts> buckets = new LinkedHashMap<>();
        int totalTarget = 0;
        int totalActual = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int t = target.getOrDefault(b, 0);
            int a = actual.getOrDefault(b, 0);
            int u = unique.getOrDefault(b, 0);
            buckets.put(b.code(), new BucketCounts(t, a, u));
            totalTarget += t;
            totalActual += a;
        }
        return new StaffPerformanceRow("Total", totalTarget, totalActual, totalUnique, buckets);
    }

    private static RegionPerformanceRow toRegionRow(
            Long regionId,
            String name,
            EnumMap<AmountBucket, Integer> actual,
            EnumMap<AmountBucket, Set<String>> phones,
            List<TownshipPerformanceRow> townships) {
        Map<String, BucketActual> buckets = new LinkedHashMap<>();
        int total = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int a = actual.getOrDefault(b, 0);
            buckets.put(b.code(), new BucketActual(a, uniqueCount(phones, b)));
            total += a;
        }
        return new RegionPerformanceRow(regionId, name, total, uniqueTotal(phones), buckets, townships);
    }

    private static TownshipPerformanceRow toTownshipRow(
            Long townshipId,
            String name,
            EnumMap<AmountBucket, Integer> actual,
            EnumMap<AmountBucket, Set<String>> phones) {
        Map<String, BucketActual> buckets = new LinkedHashMap<>();
        int total = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int a = actual.getOrDefault(b, 0);
            buckets.put(b.code(), new BucketActual(a, uniqueCount(phones, b)));
            total += a;
        }
        return new TownshipPerformanceRow(townshipId, name, total, uniqueTotal(phones), buckets);
    }

    private static RegionPerformanceRow sumRegionRows(List<RegionPerformanceRow> rows) {
        EnumMap<AmountBucket, Integer> actual = emptyBucketMap();
        EnumMap<AmountBucket, Integer> unique = emptyBucketMap();
        int totalUnique = 0;
        for (RegionPerformanceRow row : rows) {
            totalUnique += row.totalUniquePhones();
            for (AmountBucket b : AmountBucket.ordered()) {
                BucketActual c = row.buckets().get(b.code());
                if (c != null) {
                    actual.merge(b, c.count(), Integer::sum);
                    unique.merge(b, c.uniquePhones(), Integer::sum);
                }
            }
        }
        Map<String, BucketActual> buckets = new LinkedHashMap<>();
        int total = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int a = actual.getOrDefault(b, 0);
            buckets.put(b.code(), new BucketActual(a, unique.getOrDefault(b, 0)));
            total += a;
        }
        return new RegionPerformanceRow(null, "Total", total, totalUnique, buckets, List.of());
    }

    private static StatusPerformanceRow toStatusRow(
            String staffKey,
            EnumMap<InviteStatus, Integer> counts,
            List<InviteStatus> statuses) {
        Map<String, Integer> map = new LinkedHashMap<>();
        int total = 0;
        for (InviteStatus s : statuses) {
            int n = counts.getOrDefault(s, 0);
            map.put(s.name(), n);
            total += n;
        }
        return new StatusPerformanceRow(staffKey, total, map);
    }

    private static StatusPerformanceRow sumStatusRows(
            List<StatusPerformanceRow> rows,
            List<InviteStatus> statuses) {
        EnumMap<InviteStatus, Integer> totals = emptyStatusMap();
        for (StatusPerformanceRow row : rows) {
            for (InviteStatus s : statuses) {
                totals.merge(s, row.statuses().getOrDefault(s.name(), 0), Integer::sum);
            }
        }
        return toStatusRow("Total", totals, statuses);
    }

    private static String statusLabel(InviteStatus status) {
        return switch (status) {
            case ATTEND -> "ပွဲတက်မယ်";
            case NOT_ATTEND -> "မတက်ဘူး";
            case UNREACHABLE -> "အဆက်အသွယ် မရသေး";
            case NOT_ANSWERED -> "ဖုန်းမကိုင်ပါ";
            case PHONE_OFF -> "စက်ပိတ်ထားပါသည်";
        };
    }

    private static StatusBreakdownRow toBreakdownRow(
            InviteStatus status,
            EnumMap<AmountBucket, Integer> actual,
            EnumMap<AmountBucket, Set<String>> phones) {
        Map<String, BucketActual> buckets = new LinkedHashMap<>();
        int total = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int a = actual.getOrDefault(b, 0);
            buckets.put(b.code(), new BucketActual(a, uniqueCount(phones, b)));
            total += a;
        }
        return new StatusBreakdownRow(
                status.name(),
                statusLabel(status),
                total,
                uniqueTotal(phones),
                buckets);
    }

    private static StatusBreakdownRow sumBreakdownRows(List<StatusBreakdownRow> rows) {
        EnumMap<AmountBucket, Integer> actual = emptyBucketMap();
        EnumMap<AmountBucket, Integer> unique = emptyBucketMap();
        int totalUnique = 0;
        int total = 0;
        for (StatusBreakdownRow row : rows) {
            total += row.total();
            totalUnique += row.totalUniquePhones();
            for (AmountBucket b : AmountBucket.ordered()) {
                BucketActual c = row.buckets().get(b.code());
                if (c != null) {
                    actual.merge(b, c.count(), Integer::sum);
                    unique.merge(b, c.uniquePhones(), Integer::sum);
                }
            }
        }
        Map<String, BucketActual> buckets = new LinkedHashMap<>();
        for (AmountBucket b : AmountBucket.ordered()) {
            buckets.put(b.code(), new BucketActual(
                    actual.getOrDefault(b, 0),
                    unique.getOrDefault(b, 0)));
        }
        return new StatusBreakdownRow("TOTAL", "Total", total, totalUnique, buckets);
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return new BigDecimal(value.toString());
    }
}
