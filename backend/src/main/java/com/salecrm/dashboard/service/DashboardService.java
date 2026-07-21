package com.salecrm.dashboard.service;

import com.salecrm.common.exception.ForbiddenBranchAccessException;
import com.salecrm.dashboard.dto.DashboardSummary;
import com.salecrm.dashboard.dto.NamedCount;
import com.salecrm.dashboard.dto.ReportSummary;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private static final ZoneId YANGON = ZoneId.of("Asia/Yangon");

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public DashboardSummary summary(Long branchId) {
        Long scoped = resolveBranchId(branchId);
        LocalDate today = LocalDate.now(YANGON);
        Instant dayStart = today.atStartOfDay(YANGON).toInstant();
        Instant monthStart = today.withDayOfMonth(1).atStartOfDay(YANGON).toInstant();

        Object[] totals = aggregateTotals(scoped, null, null);
        long totalRecords = ((Number) totals[0]).longValue();
        BigDecimal totalAmount = toBd(totals[1]);

        long recordsToday = ((Number) aggregateTotals(scoped, dayStart, null)[0]).longValue();
        long recordsThisMonth = ((Number) aggregateTotals(scoped, monthStart, null)[0]).longValue();

        return new DashboardSummary(
                totalRecords,
                totalAmount,
                recordsToday,
                recordsThisMonth,
                groupAction(scoped, null, null),
                groupBranch(scoped, null, null),
                groupRegion(scoped, null, null),
                groupTownship(scoped, null, null)
        );
    }

    @Transactional(readOnly = true)
    public ReportSummary report(Long branchId, Instant from, Instant to) {
        Long scoped = resolveBranchId(branchId);
        Object[] totals = aggregateTotals(scoped, from, to);

        return new ReportSummary(
                ((Number) totals[0]).longValue(),
                toBd(totals[1]),
                groupAction(scoped, from, to),
                groupBranch(scoped, from, to),
                groupRegion(scoped, from, to),
                groupTownship(scoped, from, to),
                groupStaff(scoped, from, to)
        );
    }

    private Object[] aggregateTotals(Long branchId, Instant from, Instant to) {
        StringBuilder jpql = new StringBuilder("""
                SELECT COUNT(h.id), COALESCE(SUM(h.amount), 0)
                FROM CrmHistory h WHERE 1 = 1
                """);
        Map<String, Object> params = new HashMap<>();
        appendFilters(jpql, params, branchId, from, to);
        TypedQuery<Object[]> q = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(q::setParameter);
        return q.getSingleResult();
    }

    private List<NamedCount> groupAction(Long branchId, Instant from, Instant to) {
        return group("""
                SELECT h.actionType, COUNT(h.id), COALESCE(SUM(h.amount), 0)
                FROM CrmHistory h WHERE 1 = 1
                """, " GROUP BY h.actionType ORDER BY COUNT(h.id) DESC", branchId, from, to);
    }

    private List<NamedCount> groupBranch(Long branchId, Instant from, Instant to) {
        return group("""
                SELECT h.branch.name, COUNT(h.id), COALESCE(SUM(h.amount), 0)
                FROM CrmHistory h WHERE 1 = 1
                """, " GROUP BY h.branch.name ORDER BY COUNT(h.id) DESC", branchId, from, to);
    }

    private List<NamedCount> groupRegion(Long branchId, Instant from, Instant to) {
        return group("""
                SELECT h.region.nameMm, COUNT(h.id), COALESCE(SUM(h.amount), 0)
                FROM CrmHistory h WHERE h.region IS NOT NULL
                """, " GROUP BY h.region.nameMm ORDER BY COUNT(h.id) DESC", branchId, from, to);
    }

    private List<NamedCount> groupTownship(Long branchId, Instant from, Instant to) {
        return group("""
                SELECT h.township.nameMm, COUNT(h.id), COALESCE(SUM(h.amount), 0)
                FROM CrmHistory h WHERE h.township IS NOT NULL
                """, " GROUP BY h.township.nameMm ORDER BY COUNT(h.id) DESC", branchId, from, to);
    }

    private List<NamedCount> groupStaff(Long branchId, Instant from, Instant to) {
        return group("""
                SELECT COALESCE(h.createdBy, 'Unknown'), COUNT(h.id), COALESCE(SUM(h.amount), 0)
                FROM CrmHistory h WHERE 1 = 1
                """, " GROUP BY h.createdBy ORDER BY COUNT(h.id) DESC", branchId, from, to);
    }

    private List<NamedCount> group(
            String head, String tail, Long branchId, Instant from, Instant to) {
        StringBuilder jpql = new StringBuilder(head);
        Map<String, Object> params = new HashMap<>();
        appendFilters(jpql, params, branchId, from, to);
        jpql.append(tail);
        TypedQuery<Object[]> q = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(q::setParameter);
        List<Object[]> rows = q.getResultList();
        List<NamedCount> out = new ArrayList<>();
        for (Object[] row : rows) {
            out.add(new NamedCount(
                    row[0] == null ? "—" : row[0].toString(),
                    ((Number) row[1]).longValue(),
                    toBd(row[2])));
        }
        return out;
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

    private static void appendFilters(
            StringBuilder jpql,
            Map<String, Object> params,
            Long branchId,
            Instant from,
            Instant to) {
        if (branchId != null) {
            jpql.append(" AND h.branch.id = :branchId");
            params.put("branchId", branchId);
        }
        if (from != null) {
            jpql.append(" AND h.createdAt >= :fromTs");
            params.put("fromTs", from);
        }
        if (to != null) {
            jpql.append(" AND h.createdAt < :toTs");
            params.put("toTs", to);
        }
    }

    private static BigDecimal toBd(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        return new BigDecimal(v.toString());
    }
}
