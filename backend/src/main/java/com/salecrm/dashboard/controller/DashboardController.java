package com.salecrm.dashboard.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.dashboard.dto.DashboardSummary;
import com.salecrm.dashboard.dto.ReportSummary;
import com.salecrm.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private static final ZoneId YANGON = ZoneId.of("Asia/Yangon");

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("@perm.can('DASHBOARD_VIEW')")
    public ApiResponse<DashboardSummary> summary(@RequestParam(required = false) Long branchId) {
        return ApiResponse.ok(dashboardService.summary(branchId));
    }

    @GetMapping("/report")
    @PreAuthorize("@perm.can('REPORT_VIEW')")
    public ApiResponse<ReportSummary> report(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Instant fromTs = from == null ? null : from.atStartOfDay(YANGON).toInstant();
        Instant toTs = to == null ? null : to.plusDays(1).atStartOfDay(YANGON).toInstant();
        return ApiResponse.ok(dashboardService.report(branchId, fromTs, toTs));
    }
}
