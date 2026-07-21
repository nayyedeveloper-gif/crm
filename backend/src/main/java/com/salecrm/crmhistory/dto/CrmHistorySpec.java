package com.salecrm.crmhistory.dto;

import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.CrmHistory;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds a JPA Specification for filtering CRM History records.
 * Supports branch scoping, free-text search, action type, phone, region, and township filters.
 */
public final class CrmHistorySpec {

    private CrmHistorySpec() {
    }

    public static Specification<CrmHistory> withFilter(CrmHistoryFilter filter) {
        return (root, query, cb) -> {
            if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("branch", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("region", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("township", jakarta.persistence.criteria.JoinType.LEFT);
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();

            if (filter.branchId() != null) {
                predicates.add(cb.equal(root.get("branch").get("id"), filter.branchId()));
            }

            if (StringUtils.hasText(filter.search())) {
                String pattern = "%" + filter.search().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("customerName")), pattern),
                        cb.like(cb.lower(root.get("phone")), pattern),
                        cb.like(cb.lower(root.get("remark")), pattern)
                ));
            }

            if (filter.actionType() != null) {
                predicates.add(cb.equal(root.get("actionType"), filter.actionType()));
            }

            if (StringUtils.hasText(filter.phone())) {
                predicates.add(cb.equal(root.get("phone"), filter.phone()));
            }

            if (filter.regionId() != null) {
                predicates.add(cb.equal(root.get("region").get("id"), filter.regionId()));
            }

            if (filter.townshipId() != null) {
                predicates.add(cb.equal(root.get("township").get("id"), filter.townshipId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<CrmHistory> withFilter(CrmHistoryFilter filter, ActionType actionType) {
        return withFilter(new CrmHistoryFilter(
                filter.branchId(), filter.search(), actionType,
                filter.phone(), filter.regionId(), filter.townshipId()
        ));
    }
}
