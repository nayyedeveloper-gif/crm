package com.salecrm.performance.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.InviteStatus;
import com.salecrm.performance.dto.*;
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
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) InviteStatus inviteStatus,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(performanceService.staffPerformance(buildFilter(
                branchId, actionType, inviteStatus, regionId, townshipId, from, to)));
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
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) InviteStatus inviteStatus,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(performanceService.regionPerformance(buildFilter(
                branchId, actionType, inviteStatus, regionId, townshipId, from, to)));
    }

    @GetMapping("/status-by-staff")
    @PreAuthorize("@perm.can('PERFORMANCE_VIEW')")
    public ApiResponse<StatusPerformanceResponse> statusByStaff(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) InviteStatus inviteStatus,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(performanceService.statusPerformance(buildFilter(
                branchId, actionType, inviteStatus, regionId, townshipId, from, to)));
    }

    @GetMapping("/status-breakdown")
    @PreAuthorize("@perm.can('PERFORMANCE_VIEW')")
    public ApiResponse<StatusBreakdownResponse> statusBreakdown(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) InviteStatus inviteStatus,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(performanceService.statusBreakdown(buildFilter(
                branchId, actionType, inviteStatus, regionId, townshipId, from, to)));
    }

    private static PerformanceFilter buildFilter(
            Long branchId,
            ActionType actionType,
            InviteStatus inviteStatus,
            Long regionId,
            Long townshipId,
            LocalDate from,
            LocalDate to) {
        return new PerformanceFilter(
                branchId,
                actionType,
                inviteStatus,
                regionId,
                townshipId,
                toInstantStart(from),
                toInstantEndExclusive(to));
    }

    private static Instant toInstantStart(LocalDate date) {
        return date == null ? null : date.atStartOfDay(YANGON).toInstant();
    }

    private static Instant toInstantEndExclusive(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay(YANGON).toInstant();
    }
}
