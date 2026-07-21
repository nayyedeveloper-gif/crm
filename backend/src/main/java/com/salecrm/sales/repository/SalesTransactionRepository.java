package com.salecrm.sales.repository;

import com.salecrm.sales.entity.SalesTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
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
}
