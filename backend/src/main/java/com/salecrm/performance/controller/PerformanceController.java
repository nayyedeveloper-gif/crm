package com.salecrm.performance.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.performance.dto.RegionPerformanceResponse;
import com.salecrm.performance.dto.StaffPerformanceResponse;
import com.salecrm.performance.dto.StaffPerformanceRow;
import com.salecrm.performance.dto.UpdateStaffTargetRequest;
import com.salecrm.performance.service.PerformanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@RestController
@RequestMapping("/performance")
@RequiredArgsConstructor
public class PerformanceController {

    private static final ZoneId YANGON = ZoneId.of("Asia/Yangon");

    private final PerformanceService performanceService;

    @GetMapping("/staff")
    @PreAuthorize("@perm.can('PERFORMANCE_VIEW')")
    public ApiResponse<StaffPerformanceResponse> staff(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(performanceService.staffPerformance(
                branchId, toInstantStart(from), toInstantEndExclusive(to)));
    }

    @PutMapping("/staff/targets")
    @PreAuthorize("@perm.can('PERFORMANCE_EDIT_TARGET')")
    public ResponseEntity<ApiResponse<StaffPerformanceRow>> updateTargets(
            @Valid @RequestBody UpdateStaffTargetRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                performanceService.upsertTargets(request), "Targets saved"));
    }

    @GetMapping("/regions")
    @PreAuthorize("@perm.can('PERFORMANCE_VIEW')")
    public ApiResponse<RegionPerformanceResponse> regions(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(performanceService.regionPerformance(
                branchId, toInstantStart(from), toInstantEndExclusive(to)));
    }

    private static Instant toInstantStart(LocalDate date) {
        return date == null ? null : date.atStartOfDay(YANGON).toInstant();
    }

    private static Instant toInstantEndExclusive(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay(YANGON).toInstant();
    }
}
