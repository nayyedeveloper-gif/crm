package com.salecrm.log.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.log.dto.ChangeLogResponse;
import com.salecrm.log.dto.SystemLogResponse;
import com.salecrm.log.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/settings/logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class LogController {

    private final AuditLogService auditLogService;

    @GetMapping("/changes")
    public ApiResponse<List<ChangeLogResponse>> changeLogs() {
        return ApiResponse.ok(auditLogService.listChangeLogs());
    }

    @GetMapping("/system")
    public ApiResponse<List<SystemLogResponse>> systemLogs() {
        return ApiResponse.ok(auditLogService.listSystemLogs());
    }
}
