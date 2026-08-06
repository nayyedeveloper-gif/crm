package com.salecrm.legacy.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.common.web.PageResponse;
import com.salecrm.legacy.dto.LegacyCrmImportResult;
import com.salecrm.legacy.dto.LegacyHealthResponse;
import com.salecrm.legacy.dto.LegacyTableInfo;
import com.salecrm.legacy.service.LegacyCrmImportService;
import com.salecrm.legacy.service.LegacyReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Read-only bridge to Laravel {@code shop_sales} MySQL while Sale-CRM keeps PostgreSQL as primary.
 */
@RestController
@RequestMapping("/legacy")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.legacy-mysql", name = "enabled", havingValue = "true")
@PreAuthorize("hasRole('ADMIN') or @perm.canAny('CRM_VIEW','SALES_VIEW','BACKUP_MANAGE')")
public class LegacyDataController {

    private final LegacyReadService legacyReadService;
    private final LegacyCrmImportService legacyCrmImportService;

    @GetMapping("/health")
    public ApiResponse<LegacyHealthResponse> health() {
        return ApiResponse.ok(legacyReadService.health());
    }

    @GetMapping("/tables")
    public ApiResponse<List<LegacyTableInfo>> tables() {
        return ApiResponse.ok(legacyReadService.listTables());
    }

    @GetMapping("/tables/{table}")
    public ApiResponse<PageResponse<Map<String, Object>>> page(
            @PathVariable String table,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ApiResponse.ok(legacyReadService.page(table, page, size));
    }

    @GetMapping("/tables/{table}/{id}")
    public ApiResponse<Map<String, Object>> byId(
            @PathVariable String table,
            @PathVariable long id
    ) {
        return ApiResponse.ok(legacyReadService.findById(table, id));
    }

    @GetMapping("/crm-histories")
    public ApiResponse<PageResponse<Map<String, Object>>> crmHistories(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ApiResponse.ok(legacyReadService.searchCrmHistories(q, page, size));
    }

    @GetMapping("/master-setup")
    public ApiResponse<PageResponse<Map<String, Object>>> masterSetup(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long branchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ApiResponse.ok(legacyReadService.searchMasterSetup(q, branchId, page, size));
    }

    @PostMapping("/import/crm")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<com.salecrm.legacy.dto.LegacyCrmImportResult> importCrm(
            @RequestParam(defaultValue = "true") boolean replaceLegacyRows
    ) {
        return ApiResponse.ok(
                legacyCrmImportService.importAll(replaceLegacyRows),
                "CRM import completed");
    }
}
