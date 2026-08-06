package com.salecrm.performance.repository;

import com.salecrm.performance.dto.PerformanceFilter;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Dynamic JPQL so optional filters never bind null parameters
 * (avoids Hibernate "could not determine type" / empty-result bugs).
 */
@Repository
public class PerformanceQueryRepository {

    @PersistenceContext
    private EntityManager entityManager;

    /** [createdBy, amount, phone] */
    public List<Object[]> findStaffAmounts(PerformanceFilter filter) {
        StringBuilder jpql = new StringBuilder("""
                SELECT COALESCE(h.createdBy, 'Unknown'), h.amount, h.phone
                FROM CrmHistory h
                WHERE 1 = 1
                """);
        Map<String, Object> params = new HashMap<>();
        appendFilters(jpql, params, filter);

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    /** [regionId, townshipId, amount, phone] */
    public List<Object[]> findRegionAmounts(PerformanceFilter filter) {
        StringBuilder jpql = new StringBuilder("""
                SELECT CASE WHEN h.region IS NULL THEN NULL ELSE h.region.id END,
                       CASE WHEN h.township IS NULL THEN NULL ELSE h.township.id END,
                       h.amount,
                       h.phone
                FROM CrmHistory h
                WHERE 1 = 1
                """);
        Map<String, Object> params = new HashMap<>();
        appendFilters(jpql, params, filter);

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    /** [createdBy, inviteStatus] — inviteStatus never null */
    public List<Object[]> findStaffStatusCounts(PerformanceFilter filter) {
        StringBuilder jpql = new StringBuilder("""
                SELECT COALESCE(h.createdBy, 'Unknown'), h.inviteStatus
                FROM CrmHistory h
                WHERE h.inviteStatus IS NOT NULL
                """);
        Map<String, Object> params = new HashMap<>();
        appendFilters(jpql, params, filter);

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    /** [inviteStatus, amount, phone] — inviteStatus never null */
    public List<Object[]> findStatusBreakdownAmounts(PerformanceFilter filter) {
        StringBuilder jpql = new StringBuilder("""
                SELECT h.inviteStatus, h.amount, h.phone
                FROM CrmHistory h
                WHERE h.inviteStatus IS NOT NULL
                """);
        Map<String, Object> params = new HashMap<>();
        appendFilters(jpql, params, filter);

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    private static void appendFilters(
            StringBuilder jpql,
            Map<String, Object> params,
            PerformanceFilter filter) {
        if (filter == null) {
            return;
        }
        if (filter.branchId() != null) {
            jpql.append(" AND h.branch.id = :branchId");
            params.put("branchId", filter.branchId());
        }
        if (filter.actionType() != null) {
            jpql.append(" AND h.actionType = :actionType");
            params.put("actionType", filter.actionType());
        }
        if (filter.inviteStatus() != null) {
            jpql.append(" AND h.inviteStatus = :inviteStatus");
            params.put("inviteStatus", filter.inviteStatus());
        }
        if (filter.regionId() != null) {
            jpql.append(" AND h.region.id = :regionId");
            params.put("regionId", filter.regionId());
        }
        if (filter.townshipId() != null) {
            jpql.append(" AND h.township.id = :townshipId");
            params.put("townshipId", filter.townshipId());
        }
        if (filter.from() != null) {
            jpql.append(" AND h.createdAt >= :fromTs");
            params.put("fromTs", filter.from());
        }
        if (filter.to() != null) {
            jpql.append(" AND h.createdAt < :toTs");
            params.put("toTs", filter.to());
        }
    }
}
