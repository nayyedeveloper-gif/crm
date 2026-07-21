package com.salecrm.shopcustomer;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ShopCustomerRepository extends JpaRepository<ShopCustomer, Long> {
    Optional<ShopCustomer> findByGoogleSub(String googleSub);

    Optional<ShopCustomer> findByEmailIgnoreCase(String email);

    long countByActiveTrue();

    long countByTrustedTrue();

    long countByCustomerTier(ShopCustomerTier tier);

    @Query("""
            SELECT c FROM ShopCustomer c
            WHERE (:q IS NULL OR :q = ''
                OR LOWER(c.email) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(c.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR COALESCE(c.phone, '') LIKE CONCAT('%', :q, '%'))
              AND (:tier IS NULL OR c.customerTier = :tier)
              AND (:trusted IS NULL OR c.trusted = :trusted)
              AND (:active IS NULL OR c.active = :active)
            """)
    Page<ShopCustomer> search(
            @Param("q") String q,
            @Param("tier") ShopCustomerTier tier,
            @Param("trusted") Boolean trusted,
            @Param("active") Boolean active,
            Pageable pageable);
}
