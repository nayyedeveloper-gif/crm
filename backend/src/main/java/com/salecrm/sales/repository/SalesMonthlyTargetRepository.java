package com.salecrm.sales.repository;

import com.salecrm.sales.entity.SalesMonthlyTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SalesMonthlyTargetRepository extends JpaRepository<SalesMonthlyTarget, Long> {

    List<SalesMonthlyTarget> findByMonthLabelIgnoreCase(String monthLabel);

    @Modifying
    @Query("DELETE FROM SalesMonthlyTarget t WHERE LOWER(t.monthLabel) = LOWER(:monthLabel)")
    int deleteByMonthLabel(String monthLabel);
}
