package com.salecrm.nrc.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.nrc.dto.NrcResponse;
import com.salecrm.nrc.service.NrcService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/nrcs")
@RequiredArgsConstructor
@PreAuthorize("@perm.canAny('CRM_VIEW','CRM_EDIT','SALES_VIEW')")
public class NrcController {

    private final NrcService nrcService;

    @GetMapping
    public ApiResponse<List<NrcResponse>> all() {
        return ApiResponse.ok(nrcService.findAll());
    }

    @GetMapping("/{nrcCode}")
    public ApiResponse<List<NrcResponse>> byCode(@PathVariable Integer nrcCode) {
        return ApiResponse.ok(nrcService.findByNrcCode(nrcCode));
    }
}
