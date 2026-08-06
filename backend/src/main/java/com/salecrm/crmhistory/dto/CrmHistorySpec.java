package com.salecrm.crmhistory.dto;

import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.CrmHistory;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
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
                        cb.like(cb.lower(root.get("remark")), pattern),
                        cb.like(cb.lower(root.get("createdBy")), pattern)
                ));
            }

            if (filter.actionType() != null) {
                predicates.add(cb.equal(root.get("actionType"), filter.actionType()));
            }

            if (filter.inviteStatus() != null) {
                predicates.add(cb.equal(root.get("inviteStatus"), filter.inviteStatus()));
            }

            if (StringUtils.hasText(filter.phone())) {
                predicates.add(cb.equal(root.get("phone"), filter.phone()));
            }

            if (StringUtils.hasText(filter.createdBy())) {
                predicates.add(cb.like(
                        cb.lower(root.get("createdBy")),
                        "%" + filter.createdBy().toLowerCase() + "%"
                ));
            }

            if (filter.createdFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.createdFrom()));
            }

            if (filter.createdToExclusive() != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), filter.createdToExclusive()));
            }

            if (StringUtils.hasText(filter.amountBucket())) {
                // CRM amount is MMK; buckets are in သိန်း (100,000 MMK)
                BigDecimal factor = new BigDecimal("100000");
                switch (filter.amountBucket()) {
                    case "B_50_100", "amount_50_to_100" -> {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), factor.multiply(new BigDecimal("50"))));
                        predicates.add(cb.lessThan(root.get("amount"), factor.multiply(new BigDecimal("100"))));
                    }
                    case "B_100_300", "amount_100_to_300" -> {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), factor.multiply(new BigDecimal("100"))));
                        predicates.add(cb.lessThan(root.get("amount"), factor.multiply(new BigDecimal("300"))));
                    }
                    case "B_300_500", "amount_300_to_500" -> {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), factor.multiply(new BigDecimal("300"))));
                        predicates.add(cb.lessThan(root.get("amount"), factor.multiply(new BigDecimal("500"))));
                    }
                    case "B_500_1000", "amount_500_to_1000" -> {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), factor.multiply(new BigDecimal("500"))));
                        predicates.add(cb.lessThan(root.get("amount"), factor.multiply(new BigDecimal("1000"))));
                    }
                    case "B_1000_PLUS", "amount_above_1000" -> {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), factor.multiply(new BigDecimal("1000"))));
                    }
                    case "OTHER", "amount_other" -> {
                        predicates.add(cb.lessThan(root.get("amount"), factor.multiply(new BigDecimal("50"))));
                    }
                    default -> {
                        // ignore unknown value for backward compatibility
                    }
                }
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
                filter.branchId(), filter.search(), actionType, filter.inviteStatus(),
                filter.phone(), filter.createdBy(), filter.createdFrom(), filter.createdToExclusive(),
                filter.amountBucket(), filter.regionId(), filter.townshipId()
        ));
    }
}
