package com.salecrm.media.service;

import com.salecrm.media.dto.ThumbBackfillResponse;
import com.salecrm.product.service.ProductImageStorage;
import com.salecrm.showcase.service.ShowcaseImageStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThumbBackfillService {

    private final ShowcaseImageStorage showcaseImageStorage;
    private final ProductImageStorage productImageStorage;

    public ThumbBackfillResponse backfillAll() {
        log.info("Starting offline thumb backfill (showcase + products)");
        var showcase = showcaseImageStorage.backfillMissingThumbs();
        var products = productImageStorage.backfillMissingThumbs();
        return new ThumbBackfillResponse(
                new ThumbBackfillResponse.SectionStats(
                        showcase.scanned(), showcase.created(), showcase.skipped(), showcase.failed()),
                new ThumbBackfillResponse.SectionStats(
                        products.scanned(), products.created(), products.skipped(), products.failed()));
    }
}
