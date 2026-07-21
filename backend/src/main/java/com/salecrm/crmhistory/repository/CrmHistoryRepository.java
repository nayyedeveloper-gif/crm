package com.salecrm.crmhistory.repository;

import com.salecrm.crmhistory.entity.CrmHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CrmHistoryRepository
        extends JpaRepository<CrmHistory, Long>, JpaSpecificationExecutor<CrmHistory> {

    @EntityGraph(attributePaths = {"branch", "region", "township"})
    Optional<CrmHistory> findWithDetailsById(@Param("id") Long id);

    long countByBranchId(Long branchId);
}
