package com.salecrm.sales.dto;

import com.salecrm.sales.entity.SalesTransaction;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public final class SalesTransactionSpec {

    private SalesTransactionSpec() {
    }

    public static Specification<SalesTransaction> withFilter(SalesTransactionFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("saleDate"), filter.from()));
            }
            if (filter.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("saleDate"), filter.to()));
            }
        if (filter.branchNames() != null && !filter.branchNames().isEmpty()) {
                predicates.add(root.get("branchName").in(filter.branchNames()));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    public static boolean isValidRow(SalesTransaction row) {
        return StringUtils.hasText(row.getBranchName())
                || row.getSaleDate() != null
                || StringUtils.hasText(row.getTransactionTs());
    }
}
