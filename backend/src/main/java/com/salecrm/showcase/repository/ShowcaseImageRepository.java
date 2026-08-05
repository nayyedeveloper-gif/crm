package com.salecrm.showcase.repository;

import com.salecrm.showcase.entity.ShowcaseImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ShowcaseImageRepository extends JpaRepository<ShowcaseImage, Long> {

    @Query("""
            SELECT img FROM ShowcaseImage img
            JOIN FETCH img.item i
            JOIN FETCH i.branch
            WHERE i.id = :itemId AND img.id = :imageId
            """)
    Optional<ShowcaseImage> findForItem(@Param("itemId") Long itemId, @Param("imageId") Long imageId);
}
