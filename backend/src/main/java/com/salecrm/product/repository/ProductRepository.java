package com.salecrm.product.repository;

import com.salecrm.product.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = "categoryEntity")
    List<Product> findAllByOrderByUpdatedAtDesc();

    @EntityGraph(attributePaths = "categoryEntity")
    Optional<Product> findWithCategoryById(Long id);

    Optional<Product> findByPublicCodeAndActiveTrue(String publicCode);

    Optional<Product> findByPublicCode(String publicCode);

    @EntityGraph(attributePaths = "categoryEntity")
    List<Product> findAllByActiveTrueOrderByUpdatedAtDesc();

    @EntityGraph(attributePaths = "categoryEntity")
    List<Product> findAllByActiveTrueAndCategoryIgnoreCaseOrderByUpdatedAtDesc(String category);

    @EntityGraph(attributePaths = "categoryEntity")
    @Query("""
            SELECT p FROM Product p
            WHERE p.active = true
              AND (
                   LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY p.updatedAt DESC
            """)
    List<Product> searchPublicByQuery(@Param("q") String q);

    @EntityGraph(attributePaths = "categoryEntity")
    @Query("""
            SELECT p FROM Product p
            WHERE p.active = true
              AND LOWER(p.category) = LOWER(:category)
              AND (
                   LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY p.updatedAt DESC
            """)
    List<Product> searchPublicByCategoryAndQuery(
            @Param("category") String category,
            @Param("q") String q);

    @EntityGraph(attributePaths = "categoryEntity")
    List<Product> findAllByActiveTrueAndFeaturedTrueOrderByUpdatedAtDesc();

    @EntityGraph(attributePaths = "categoryEntity")
    @Query("""
            SELECT p FROM Product p
            WHERE p.active = true
              AND p.specialOffer = true
              AND (p.offerEndsAt IS NULL OR p.offerEndsAt > :now)
            ORDER BY p.offerEndsAt ASC NULLS LAST, p.updatedAt DESC
            """)
    List<Product> findActiveSpecialOffers(@Param("now") java.time.Instant now);

    @EntityGraph(attributePaths = "categoryEntity")
    List<Product> findTop8ByActiveTrueAndCategoryIgnoreCaseAndPublicCodeNotOrderByUpdatedAtDesc(
            String category, String publicCode);

    boolean existsByPublicCode(String publicCode);

    boolean existsByProductCodeIgnoreCase(String productCode);

    boolean existsByProductCodeIgnoreCaseAndIdNot(String productCode, Long id);

    long countByCategoryEntity_Id(Long categoryId);

    @Modifying(clearAutomatically = true)
    @Query("update Product p set p.category = :name where p.categoryEntity.id = :categoryId")
    int syncCategoryName(@Param("categoryId") Long categoryId, @Param("name") String name);
}
