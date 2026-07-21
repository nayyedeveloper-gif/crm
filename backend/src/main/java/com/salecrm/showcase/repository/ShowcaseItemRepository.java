package com.salecrm.showcase.repository;

import com.salecrm.showcase.entity.ShowcaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShowcaseItemRepository extends JpaRepository<ShowcaseItem, Long> {

    @Query("""
            SELECT DISTINCT i FROM ShowcaseItem i
            LEFT JOIN FETCH i.images
            JOIN FETCH i.branch
            LEFT JOIN FETCH i.categoryEntity
            LEFT JOIN FETCH i.subcategoryEntity
            WHERE i.id = :id
            """)
    Optional<ShowcaseItem> findWithDetailsById(@Param("id") Long id);

    @Query("""
            SELECT DISTINCT i FROM ShowcaseItem i
            LEFT JOIN FETCH i.images
            JOIN FETCH i.branch
            LEFT JOIN FETCH i.categoryEntity
            LEFT JOIN FETCH i.subcategoryEntity
            WHERE (:branchId IS NULL OR i.branch.id = :branchId)
            """)
    List<ShowcaseItem> findAllForBranch(@Param("branchId") Long branchId);

    @Query("""
            SELECT DISTINCT i FROM ShowcaseItem i
            LEFT JOIN FETCH i.images
            JOIN FETCH i.branch
            LEFT JOIN FETCH i.categoryEntity
            LEFT JOIN FETCH i.subcategoryEntity
            WHERE (:branchId IS NULL OR i.branch.id = :branchId)
              AND (
                   LOWER(i.itemCode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(i.name) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    List<ShowcaseItem> searchForBranch(@Param("branchId") Long branchId, @Param("q") String q);

    boolean existsByBranchIdAndItemCodeIgnoreCase(Long branchId, String itemCode);

    boolean existsByBranchIdAndItemCodeIgnoreCaseAndIdNot(Long branchId, String itemCode, Long id);

    @Query("""
            SELECT i.branch.id, i.branch.code, i.branch.name, COUNT(i)
            FROM ShowcaseItem i
            WHERE i.active = true
            GROUP BY i.branch.id, i.branch.code, i.branch.name
            ORDER BY i.branch.code ASC
            """)
    List<Object[]> countActiveByBranch();

    long countByBranchIdAndActiveTrue(Long branchId);

    long countByBranchId(Long branchId);

    long countBySubcategoryEntity_Id(Long subcategoryId);

    @Modifying
    @Query("UPDATE ShowcaseItem i SET i.subCategory = :name WHERE i.subcategoryEntity.id = :subcategoryId")
    void syncSubCategoryName(@Param("subcategoryId") Long subcategoryId, @Param("name") String name);
}
