package com.salecrm.dashboard.service;

import com.salecrm.common.exception.ForbiddenBranchAccessException;
import com.salecrm.dashboard.CustomerTier;
import com.salecrm.dashboard.dto.*;
import com.salecrm.performance.AmountBucket;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class CrmCustomerService {

    private static final ZoneId YANGON = ZoneId.of("Asia/Yangon");
    private static final List<String> AGE_BANDS = List.of("18-24", "25-34", "35-44", "45-54", "55-64");

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public CrmCustomerListResponse customers(
            Long branchId,
            String monthMode,
            String tier,
            String search,
            String amountBucket,
            int limit) {
        Long scoped = resolveBranchId(branchId);
        LocalDate today = LocalDate.now(YANGON);
        Instant monthStart = "current".equalsIgnoreCase(monthMode)
                ? today.withDayOfMonth(1).atStartOfDay(YANGON).toInstant()
                : null;

        List<AggCustomer> all = aggregateCustomers(scoped, monthStart);
        Map<String, Long> tierCounts = countTiers(all);

        List<AggCustomer> filtered = all.stream()
                .filter(c -> matchesTier(c.tier, tier))
                .filter(c -> matchesSearch(c, search))
                .filter(c -> matchesAmountBucket(c.totalAmount, amountBucket))
                .sorted(Comparator
                        .comparing((AggCustomer c) -> c.totalAmount, Comparator.reverseOrder())
                        .thenComparing(c -> c.customerName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        BigDecimal totalPurchase = filtered.stream()
                .map(c -> c.totalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalVisits = filtered.stream().mapToLong(c -> c.visits).sum();
        long totalCustomers = filtered.size();
        BigDecimal avg = totalCustomers == 0
                ? BigDecimal.ZERO
                : totalPurchase.divide(BigDecimal.valueOf(totalCustomers), 2, RoundingMode.HALF_UP);

        int max = Math.max(1, Math.min(limit <= 0 ? 200 : limit, 1000));
        List<CrmCustomerRow> rows = filtered.stream().limit(max).map(this::toRow).toList();

        return new CrmCustomerListResponse(
                tierCounts,
                totalCustomers,
                totalPurchase,
                totalVisits,
                avg,
                rows);
    }

    @Transactional(readOnly = true)
    public BirthdayReportResponse birthdayReport(
            Long branchId,
            String monthMode,
            String tier,
            Integer week) {
        Long scoped = resolveBranchId(branchId);
        LocalDate today = LocalDate.now(YANGON);
        List<AggCustomer> all = aggregateCustomers(scoped, null).stream()
                .filter(c -> c.birthday != null)
                .toList();

        boolean currentMonthOnly = !"all".equalsIgnoreCase(monthMode);
        List<AggCustomer> inScope = all.stream()
                .filter(c -> !currentMonthOnly || c.birthday.getMonthValue() == today.getMonthValue())
                .filter(c -> matchesTier(c.tier, tier))
                .filter(c -> week == null || week <= 0 || birthdayWeek(c.birthday.getDayOfMonth()) == week)
                .toList();

        Map<String, Long> tierCounts = new LinkedHashMap<>();
        tierCounts.put("ALL", (long) inScope.size());
        for (CustomerTier t : CustomerTier.values()) {
            tierCounts.put(t.name(), inScope.stream().filter(c -> c.tier == t).count());
        }

        List<BirthdayWeekCard> weeks = new ArrayList<>();
        for (int w = 1; w <= 4; w++) {
            final int weekNo = w;
            List<AggCustomer> weekCustomers = inScope.stream()
                    .filter(c -> birthdayWeek(c.birthday.getDayOfMonth()) == weekNo)
                    .toList();
            weeks.add(new BirthdayWeekCard(
                    weekNo,
                    "WEEK " + weekNo,
                    weekDayRange(weekNo),
                    weekCustomers.size(),
                    tierCountMap(weekCustomers),
                    ageCountMap(weekCustomers, today)));
        }

        Map<Long, List<AggCustomer>> byRegion = new LinkedHashMap<>();
        for (AggCustomer c : inScope) {
            Long key = c.regionId == null ? -1L : c.regionId;
            byRegion.computeIfAbsent(key, k -> new ArrayList<>()).add(c);
        }
        List<BirthdayRegionCard> regions = byRegion.entrySet().stream()
                .map(e -> {
                    List<AggCustomer> list = e.getValue();
                    String name = e.getKey() == -1L
                            ? "Region မရှိ"
                            : (list.getFirst().regionName == null ? "Region မရှိ" : list.getFirst().regionName);
                    return new BirthdayRegionCard(
                            e.getKey() == -1L ? null : e.getKey(),
                            name,
                            list.size(),
                            tierCountMap(list),
                            ageCountMap(list, today));
                })
                .sorted(Comparator.comparingLong(BirthdayRegionCard::totalCustomers).reversed())
                .toList();

        List<CrmCustomerRow> birthdayToday = all.stream()
                .filter(c -> c.birthday != null
                        && c.birthday.getMonthValue() == today.getMonthValue()
                        && c.birthday.getDayOfMonth() == today.getDayOfMonth())
                .filter(c -> matchesTier(c.tier, tier))
                .sorted(Comparator.comparing(c -> c.customerName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toRow)
                .toList();

        return new BirthdayReportResponse(
                tierCounts,
                inScope.size(),
                weeks,
                regions,
                birthdayToday);
    }

    private List<AggCustomer> aggregateCustomers(Long branchId, Instant activityFrom) {
        StringBuilder jpql = new StringBuilder("""
                SELECT h.phone, h.customerName, h.birthday, h.amount, h.createdAt, h.createdBy,
                       h.branch.id, h.branch.name,
                       h.region.id, h.region.nameMm,
                       h.township.id, h.township.nameMm,
                       h.address
                FROM CrmHistory h
                LEFT JOIN h.region
                LEFT JOIN h.township
                WHERE h.phone IS NOT NULL AND h.phone <> ''
                """);
        Map<String, Object> params = new HashMap<>();
        if (branchId != null) {
            jpql.append(" AND h.branch.id = :branchId");
            params.put("branchId", branchId);
        }
        if (activityFrom != null) {
            jpql.append(" AND h.createdAt >= :activityFrom");
            params.put("activityFrom", activityFrom);
        }

        TypedQuery<Object[]> q = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(q::setParameter);
        List<Object[]> rows = q.getResultList();

        Map<String, MutableAgg> map = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String phone = normalizePhone(row[0]);
            if (phone == null) {
                continue;
            }
            MutableAgg agg = map.computeIfAbsent(phone, MutableAgg::new);
            String name = row[1] == null ? "" : row[1].toString();
            LocalDate birthday = (LocalDate) row[2];
            BigDecimal amount = toBd(row[3]);
            Instant createdAt = toInstant(row[4]);
            String createdBy = row[5] == null ? null : row[5].toString();
            Long bId = row[6] == null ? null : ((Number) row[6]).longValue();
            String bName = row[7] == null ? null : row[7].toString();
            Long rId = row[8] == null ? null : ((Number) row[8]).longValue();
            String rName = row[9] == null ? null : row[9].toString();
            Long tId = row[10] == null ? null : ((Number) row[10]).longValue();
            String tName = row[11] == null ? null : row[11].toString();
            String address = row[12] == null ? null : row[12].toString();

            agg.visits++;
            agg.totalAmount = agg.totalAmount.add(amount);
            if (StringUtils.hasText(name)) {
                agg.customerName = name;
            }
            if (birthday != null) {
                agg.birthday = birthday;
            }
            if (createdAt != null && (agg.lastUpdate == null || createdAt.isAfter(agg.lastUpdate))) {
                agg.lastUpdate = createdAt;
                if (StringUtils.hasText(createdBy)) {
                    agg.createdBy = createdBy;
                }
                if (bId != null) {
                    agg.branchId = bId;
                    agg.branchName = bName;
                }
                if (rId != null) {
                    agg.regionId = rId;
                    agg.regionName = rName;
                }
                if (tId != null) {
                    agg.townshipId = tId;
                    agg.townshipName = tName;
                }
                if (StringUtils.hasText(address)) {
                    agg.address = address;
                }
            }
            // Prefer branch with highest spend
            if (bId != null) {
                BigDecimal prev = agg.branchAmounts.getOrDefault(bId, BigDecimal.ZERO);
                BigDecimal next = prev.add(amount);
                agg.branchAmounts.put(bId, next);
                if (agg.bestBranchAmount == null || next.compareTo(agg.bestBranchAmount) > 0) {
                    agg.bestBranchAmount = next;
                    agg.branchId = bId;
                    agg.branchName = bName;
                }
            }
        }

        List<AggCustomer> result = new ArrayList<>(map.size());
        for (MutableAgg m : map.values()) {
            result.add(m.toAgg());
        }
        return result;
    }

    private CrmCustomerRow toRow(AggCustomer c) {
        Integer age = null;
        if (c.birthday != null) {
            age = (int) ChronoUnit.YEARS.between(c.birthday, LocalDate.now(YANGON));
        }
        return new CrmCustomerRow(
                c.phone,
                c.customerName,
                c.tier,
                c.birthday,
                age,
                c.branchName,
                c.branchId,
                c.regionName,
                c.regionId,
                c.townshipName,
                c.townshipId,
                c.address,
                c.createdBy,
                c.totalAmount,
                c.visits,
                c.lastUpdate);
    }

    private static Map<String, Long> countTiers(List<AggCustomer> customers) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (CustomerTier t : CustomerTier.values()) {
            map.put(t.name(), 0L);
        }
        for (AggCustomer c : customers) {
            map.merge(c.tier.name(), 1L, Long::sum);
        }
        return map;
    }

    private static Map<String, Long> tierCountMap(List<AggCustomer> customers) {
        Map<String, Long> map = new LinkedHashMap<>();
        map.put("CIP", 0L);
        map.put("VIP", 0L);
        map.put("VVIP", 0L);
        map.put("CARE", 0L);
        for (AggCustomer c : customers) {
            map.merge(c.tier.name(), 1L, Long::sum);
        }
        return map;
    }

    private static Map<String, Long> ageCountMap(List<AggCustomer> customers, LocalDate today) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (String band : AGE_BANDS) {
            map.put(band, 0L);
        }
        for (AggCustomer c : customers) {
            if (c.birthday == null) {
                continue;
            }
            int age = (int) ChronoUnit.YEARS.between(c.birthday, today);
            String band = ageBand(age);
            if (band != null) {
                map.merge(band, 1L, Long::sum);
            }
        }
        return map;
    }

    private static String ageBand(int age) {
        if (age >= 18 && age <= 24) return "18-24";
        if (age >= 25 && age <= 34) return "25-34";
        if (age >= 35 && age <= 44) return "35-44";
        if (age >= 45 && age <= 54) return "45-54";
        if (age >= 55 && age <= 64) return "55-64";
        return null;
    }

    private static int birthdayWeek(int dayOfMonth) {
        if (dayOfMonth <= 7) return 1;
        if (dayOfMonth <= 14) return 2;
        if (dayOfMonth <= 21) return 3;
        return 4;
    }

    private static String weekDayRange(int week) {
        return switch (week) {
            case 1 -> "1-7";
            case 2 -> "8-14";
            case 3 -> "15-21";
            default -> "22-31";
        };
    }

    private static boolean matchesTier(CustomerTier tier, String raw) {
        if (!StringUtils.hasText(raw) || "ALL".equalsIgnoreCase(raw) || "all".equalsIgnoreCase(raw)) {
            return true;
        }
        try {
            return tier == CustomerTier.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return true;
        }
    }

    private static boolean matchesSearch(AggCustomer c, String search) {
        if (!StringUtils.hasText(search)) {
            return true;
        }
        String q = search.trim().toLowerCase();
        return (c.customerName != null && c.customerName.toLowerCase().contains(q))
                || (c.phone != null && c.phone.toLowerCase().contains(q))
                || (c.townshipName != null && c.townshipName.toLowerCase().contains(q))
                || (c.regionName != null && c.regionName.toLowerCase().contains(q));
    }

    private static boolean matchesAmountBucket(BigDecimal totalAmount, String amountBucket) {
        if (!StringUtils.hasText(amountBucket) || "all".equalsIgnoreCase(amountBucket)) {
            return true;
        }
        try {
            AmountBucket bucket = AmountBucket.fromCode(amountBucket);
            return AmountBucket.fromAmount(totalAmount) == bucket;
        } catch (IllegalArgumentException ex) {
            return true;
        }
    }

    private static String normalizePhone(Object raw) {
        if (raw == null) {
            return null;
        }
        String phone = raw.toString().trim();
        return phone.isEmpty() ? null : phone;
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

    private static BigDecimal toBd(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return new BigDecimal(value.toString());
    }

    private static Instant toInstant(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof java.sql.Timestamp ts) {
            return ts.toInstant();
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant();
        }
        return Instant.parse(value.toString());
    }

    private static final class MutableAgg {
        final String phone;
        String customerName = "";
        LocalDate birthday;
        BigDecimal totalAmount = BigDecimal.ZERO;
        long visits;
        Instant lastUpdate;
        String createdBy;
        Long branchId;
        String branchName;
        Long regionId;
        String regionName;
        Long townshipId;
        String townshipName;
        String address;
        BigDecimal bestBranchAmount;
        final Map<Long, BigDecimal> branchAmounts = new HashMap<>();

        MutableAgg(String phone) {
            this.phone = phone;
        }

        AggCustomer toAgg() {
            return new AggCustomer(
                    phone,
                    customerName == null || customerName.isBlank() ? phone : customerName,
                    CustomerTier.fromAmount(totalAmount),
                    birthday,
                    branchName,
                    branchId,
                    regionName,
                    regionId,
                    townshipName,
                    townshipId,
                    address,
                    createdBy,
                    totalAmount,
                    visits,
                    lastUpdate);
        }
    }

    private record AggCustomer(
            String phone,
            String customerName,
            CustomerTier tier,
            LocalDate birthday,
            String branchName,
            Long branchId,
            String regionName,
            Long regionId,
            String townshipName,
            Long townshipId,
            String address,
            String createdBy,
            BigDecimal totalAmount,
            long visits,
            Instant lastUpdate
    ) {
    }
}
