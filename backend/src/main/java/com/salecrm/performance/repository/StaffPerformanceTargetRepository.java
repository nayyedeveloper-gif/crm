package com.salecrm.performance.repository;

import com.salecrm.performance.AmountBucket;
import com.salecrm.performance.entity.StaffPerformanceTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StaffPerformanceTargetRepository extends JpaRepository<StaffPerformanceTarget, Long> {

    @Query("SELECT t FROM StaffPerformanceTarget t WHERE t.branch IS NULL")
    List<StaffPerformanceTarget> findHeadquartersTargets();

    @Query("SELECT t FROM StaffPerformanceTarget t WHERE t.branch.id = :branchId")
    List<StaffPerformanceTarget> findByBranchId(Long branchId);

    @Query("""
            SELECT t FROM StaffPerformanceTarget t
            WHERE t.staffKey = :staffKey
              AND t.bucketCode = :bucket
              AND t.branch IS NULL
            """)
    Optional<StaffPerformanceTarget> findHqExact(String staffKey, AmountBucket bucket);

    @Query("""
            SELECT t from StaffPerformanceTarget t
            WHERE t.staffKey = :staffKey
              AND t.bucketCode = :bucket
              AND t.branch.id = :branchId
            """)
    Optional<StaffPerformanceTarget> findBranchExact(String staffKey, AmountBucket bucket, Long branchId);

    @Query("SELECT COUNT(t) FROM StaffPerformanceTarget t WHERE t.branch.id = :branchId")
    long countByBranchId(Long branchId);
}
