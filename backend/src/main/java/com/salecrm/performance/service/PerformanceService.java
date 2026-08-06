package com.salecrm.performance.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ForbiddenBranchAccessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class PerformanceService {

    private final PerformanceQueryRepository queryRepository;
    private final StaffPerformanceTargetRepository targetRepository;
    private final BranchRepository branchRepository;
    private final RegionRepository regionRepository;
    private final TownshipRepository townshipRepository;

    @Transactional(readOnly = true)
    public StaffPerformanceResponse staffPerformance(Long branchId, Instant from, Instant to) {
        Long scopedBranch = resolveBranchId(branchId);
        List<Object[]> amounts = queryRepository.findStaffAmounts(scopedBranch, from, to);

        Map<String, EnumMap<AmountBucket, Integer>> actuals = new LinkedHashMap<>();
        for (Object[] row : amounts) {
            String staffKey = row[0] != null ? row[0].toString() : "Unknown";
            BigDecimal amount = toBigDecimal(row[1]);
            AmountBucket bucket = AmountBucket.fromAmount(amount);
            actuals.computeIfAbsent(staffKey, k -> emptyBucketMap())
                    .merge(bucket, 1, Integer::sum);
        }

        Map<String, EnumMap<AmountBucket, Integer>> targets = loadTargets(scopedBranch);

        // Include staff who only have targets
        for (String key : targets.keySet()) {
            actuals.computeIfAbsent(key, k -> emptyBucketMap());
        }

        List<BucketMeta> meta = bucketMeta();
        List<StaffPerformanceRow> rows = actuals.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                .map(e -> toStaffRow(e.getKey(), e.getValue(), targets.getOrDefault(e.getKey(), emptyBucketMap())))
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

        // Return refreshed single row for this staff
        StaffPerformanceResponse full = staffPerformance(branchId, null, null);
        return full.rows().stream()
                .filter(r -> r.staffKey().equals(request.staffKey()))
                .findFirst()
                .orElse(toStaffRow(request.staffKey(), emptyBucketMap(), emptyBucketMap()));
    }

    @Transactional(readOnly = true)
    public RegionPerformanceResponse regionPerformance(Long branchId, Instant from, Instant to) {
        Long scopedBranch = resolveBranchId(branchId);
        List<Object[]> amounts = queryRepository.findRegionAmounts(scopedBranch, from, to);

        Map<Long, Region> regionMap = regionRepository.findAllByOrderBySortOrderAscNameMmAsc().stream()
                .collect(Collectors.toMap(Region::getId, r -> r, (a, b) -> a, LinkedHashMap::new));
        Map<Long, Township> townshipMap = townshipRepository.findAll().stream()
                .collect(Collectors.toMap(Township::getId, t -> t));

        Map<Long, EnumMap<AmountBucket, Integer>> regionActuals = new LinkedHashMap<>();
        Map<Long, Map<Long, EnumMap<AmountBucket, Integer>>> townshipActuals = new LinkedHashMap<>();

        for (Object[] row : amounts) {
            // Incomplete geo data is excluded from region performance (no "Region မရှိ")
            if (row[0] == null) {
                continue;
            }
            Long regionId = ((Number) row[0]).longValue();
            Long townshipId = row[1] == null ? null : ((Number) row[1]).longValue();
            BigDecimal amount = toBigDecimal(row[2]);
            AmountBucket bucket = AmountBucket.fromAmount(amount);

            regionActuals.computeIfAbsent(regionId, k -> emptyBucketMap())
                    .merge(bucket, 1, Integer::sum);

            // Only drill into known townships
            if (townshipId != null) {
                townshipActuals
                        .computeIfAbsent(regionId, k -> new LinkedHashMap<>())
                        .computeIfAbsent(townshipId, k -> emptyBucketMap())
                        .merge(bucket, 1, Integer::sum);
            }
        }

        List<BucketMeta> meta = bucketMeta();
        List<RegionPerformanceRow> withData = new ArrayList<>();

        for (Region region : regionMap.values()) {
            EnumMap<AmountBucket, Integer> buckets =
                    regionActuals.getOrDefault(region.getId(), emptyBucketMap());
            if (buckets.values().stream().mapToInt(Integer::intValue).sum() == 0) {
                continue; // no empty placeholder regions
            }

            Map<Long, EnumMap<AmountBucket, Integer>> twMap =
                    townshipActuals.getOrDefault(region.getId(), Map.of());

            List<TownshipPerformanceRow> townships = twMap.entrySet().stream()
                    .filter(e -> e.getKey() != null && townshipMap.containsKey(e.getKey()))
                    .sorted(Comparator.comparing(
                            e -> townshipMap.get(e.getKey()).getNameMm(),
                            String.CASE_INSENSITIVE_ORDER))
                    .map(e -> toTownshipRow(
                            e.getKey(),
                            townshipMap.get(e.getKey()).getNameMm(),
                            e.getValue()))
                    .toList();

            withData.add(toRegionRow(region.getId(), region.getNameMm(), buckets, townships));
        }

        withData.sort(Comparator.comparingInt(RegionPerformanceRow::totalActual).reversed());
        return new RegionPerformanceResponse(meta, withData, sumRegionRows(withData));
    }

    // ---- helpers ----

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

    private static List<BucketMeta> bucketMeta() {
        return AmountBucket.ordered().stream()
                .map(b -> new BucketMeta(b.code(), b.labelMm()))
                .toList();
    }

    private static StaffPerformanceRow toStaffRow(
            String staffKey,
            EnumMap<AmountBucket, Integer> actual,
            EnumMap<AmountBucket, Integer> target) {
        Map<String, BucketCounts> buckets = new LinkedHashMap<>();
        int totalTarget = 0;
        int totalActual = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int t = target.getOrDefault(b, 0);
            int a = actual.getOrDefault(b, 0);
            buckets.put(b.code(), new BucketCounts(t, a));
            totalTarget += t;
            totalActual += a;
        }
        return new StaffPerformanceRow(staffKey, totalTarget, totalActual, buckets);
    }

    private static StaffPerformanceRow sumStaffRows(List<StaffPerformanceRow> rows) {
        EnumMap<AmountBucket, Integer> actual = emptyBucketMap();
        EnumMap<AmountBucket, Integer> target = emptyBucketMap();
        for (StaffPerformanceRow row : rows) {
            for (AmountBucket b : AmountBucket.ordered()) {
                BucketCounts c = row.buckets().get(b.code());
                if (c != null) {
                    actual.merge(b, c.actual(), Integer::sum);
                    target.merge(b, c.target(), Integer::sum);
                }
            }
        }
        return toStaffRow("Total", actual, target);
    }

    private static RegionPerformanceRow toRegionRow(
            Long regionId,
            String name,
            EnumMap<AmountBucket, Integer> actual,
            List<TownshipPerformanceRow> townships) {
        Map<String, Integer> buckets = new LinkedHashMap<>();
        int total = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int a = actual.getOrDefault(b, 0);
            buckets.put(b.code(), a);
            total += a;
        }
        return new RegionPerformanceRow(regionId, name, total, buckets, townships);
    }

    private static TownshipPerformanceRow toTownshipRow(
            Long townshipId,
            String name,
            EnumMap<AmountBucket, Integer> actual) {
        Map<String, Integer> buckets = new LinkedHashMap<>();
        int total = 0;
        for (AmountBucket b : AmountBucket.ordered()) {
            int a = actual.getOrDefault(b, 0);
            buckets.put(b.code(), a);
            total += a;
        }
        return new TownshipPerformanceRow(townshipId, name, total, buckets);
    }

    private static RegionPerformanceRow sumRegionRows(List<RegionPerformanceRow> rows) {
        EnumMap<AmountBucket, Integer> actual = emptyBucketMap();
        for (RegionPerformanceRow row : rows) {
            for (AmountBucket b : AmountBucket.ordered()) {
                actual.merge(b, row.buckets().getOrDefault(b.code(), 0), Integer::sum);
            }
        }
        return toRegionRow(null, "Total", actual, List.of());
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
