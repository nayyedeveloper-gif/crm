package com.salecrm.media.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.media.dto.ThumbBackfillResponse;
import com.salecrm.media.service.ThumbBackfillService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * One-shot maintenance: pre-generate {@code *.thumb.jpg} beside full images
 * so grid requests do not resize on the hot path.
 */
@RestController
@RequestMapping("/settings/thumbs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SuppressWarnings("null")
public class ThumbBackfillController {

    private final ThumbBackfillService thumbBackfillService;

    @PostMapping("/backfill")
    public ApiResponse<ThumbBackfillResponse> backfill() {
        return ApiResponse.ok(thumbBackfillService.backfillAll(), "Thumb backfill finished");
    }
}
