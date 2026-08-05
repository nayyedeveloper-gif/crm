package com.salecrm.showcase.repository;

import com.salecrm.showcase.entity.ShowcaseImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ShowcaseImageRepository extends JpaRepository<ShowcaseImage, Long> {

    @Query("""
            SELECT img FROM ShowcaseImage img
            JOIN FETCH img.item i
            JOIN FETCH i.branch
            WHERE i.id = :itemId AND img.id = :imageId
            """)
    Optional<ShowcaseImage> findForItem(@Param("itemId") Long itemId, @Param("imageId") Long imageId);

    @Query("""
            SELECT new com.salecrm.showcase.dto.ShowcaseImageRow(img.item.id, img.id, img.sortOrder)
            FROM ShowcaseImage img
            WHERE img.item.id IN :itemIds
            ORDER BY img.item.id ASC, img.sortOrder ASC, img.id ASC
            """)
    List<ShowcaseImageRow> findRowsByItemIdIn(@Param("itemIds") Collection<Long> itemIds);
}
