package com.salecrm.performance.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.time.Instant;
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

    public List<Object[]> findStaffAmounts(Long branchId, Instant fromTs, Instant toTs) {
        StringBuilder jpql = new StringBuilder("""
                SELECT COALESCE(h.createdBy, 'Unknown'), h.amount
                FROM CrmHistory h
                WHERE 1 = 1
                """);
        Map<String, Object> params = new HashMap<>();
        appendCommonFilters(jpql, params, branchId, fromTs, toTs);

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    public List<Object[]> findRegionAmounts(Long branchId, Instant fromTs, Instant toTs) {
        StringBuilder jpql = new StringBuilder("""
                SELECT CASE WHEN h.region IS NULL THEN NULL ELSE h.region.id END,
                       CASE WHEN h.township IS NULL THEN NULL ELSE h.township.id END,
                       h.amount
                FROM CrmHistory h
                WHERE 1 = 1
                """);
        Map<String, Object> params = new HashMap<>();
        appendCommonFilters(jpql, params, branchId, fromTs, toTs);

        TypedQuery<Object[]> query = entityManager.createQuery(jpql.toString(), Object[].class);
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    private static void appendCommonFilters(
            StringBuilder jpql,
            Map<String, Object> params,
            Long branchId,
            Instant fromTs,
            Instant toTs) {
        if (branchId != null) {
            jpql.append(" AND h.branch.id = :branchId");
            params.put("branchId", branchId);
        }
        if (fromTs != null) {
            jpql.append(" AND h.createdAt >= :fromTs");
            params.put("fromTs", fromTs);
        }
        if (toTs != null) {
            jpql.append(" AND h.createdAt < :toTs");
            params.put("toTs", toTs);
        }
    }
}
