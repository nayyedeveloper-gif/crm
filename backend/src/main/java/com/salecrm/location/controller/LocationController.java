package com.salecrm.location.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.location.dto.RegionResponse;
import com.salecrm.location.dto.TownshipResponse;
import com.salecrm.location.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/locations")
@RequiredArgsConstructor
@PreAuthorize("@perm.canAny('CRM_VIEW','CRM_EDIT')")
public class LocationController {

    private final LocationService locationService;

    @GetMapping("/regions")
    public ApiResponse<List<RegionResponse>> regions() {
        return ApiResponse.ok(locationService.findAllRegions());
    }

    @GetMapping("/regions/{regionId}/townships")
    public ApiResponse<List<TownshipResponse>> townshipsByRegion(@PathVariable Long regionId) {
        return ApiResponse.ok(locationService.findTownshipsByRegion(regionId));
    }
}
