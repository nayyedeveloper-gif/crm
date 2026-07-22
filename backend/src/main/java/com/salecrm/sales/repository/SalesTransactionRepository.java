package com.salecrm.sales.repository;

import com.salecrm.sales.entity.SalesTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalesTransactionRepository extends JpaRepository<SalesTransaction, Long>,
        JpaSpecificationExecutor<SalesTransaction> {

    @Modifying
    @Query("DELETE FROM SalesTransaction")
    int deleteAllRows();

    @Query("SELECT MAX(t.updatedAt) FROM SalesTransaction t")
    Optional<java.time.Instant> findLastUpdated();

    @Query("SELECT COUNT(t) FROM SalesTransaction t")
    long countAll();

    @Query("SELECT MAX(t.saleDate) FROM SalesTransaction t")
    Optional<LocalDate> findLatestSaleDate();

    @Query("SELECT DISTINCT t.itemMainGroup FROM SalesTransaction t WHERE t.itemMainGroup IS NOT NULL ORDER BY t.itemMainGroup")
    List<String> findDistinctItemMainGroups();

    @Query("SELECT DISTINCT t.itemCategory FROM SalesTransaction t WHERE t.itemCategory IS NOT NULL ORDER BY t.itemCategory")
    List<String> findDistinctItemCategories();

    @Query("SELECT DISTINCT t.purity FROM SalesTransaction t WHERE t.purity IS NOT NULL ORDER BY t.purity")
    List<String> findDistinctPurities();

    @Query("SELECT DISTINCT t.reason FROM SalesTransaction t WHERE t.reason IS NOT NULL ORDER BY t.reason")
    List<String> findDistinctReasons();

    @Query("SELECT DISTINCT t.salesStaff FROM SalesTransaction t WHERE t.salesStaff IS NOT NULL ORDER BY t.salesStaff")
    List<String> findDistinctSalesStaff();
}
