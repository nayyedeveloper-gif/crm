package com.salecrm.showcase.repository;

import com.salecrm.showcase.entity.ShowcaseSubcategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ShowcaseSubcategoryRepository extends JpaRepository<ShowcaseSubcategory, Long> {

    @Query("""
            SELECT s FROM ShowcaseSubcategory s
            JOIN FETCH s.category
            ORDER BY s.category.sortOrder ASC, s.sortOrder ASC, s.name ASC
            """)
    List<ShowcaseSubcategory> findAllWithCategory();

    List<ShowcaseSubcategory> findByCategoryIdOrderBySortOrderAscNameAsc(Long categoryId);

    List<ShowcaseSubcategory> findByCategoryIdAndActiveTrueOrderBySortOrderAscNameAsc(Long categoryId);

    boolean existsByCategoryIdAndNameIgnoreCase(Long categoryId, String name);

    boolean existsByCategoryIdAndNameIgnoreCaseAndIdNot(Long categoryId, String name, Long id);

    long countByCategoryId(Long categoryId);
}
