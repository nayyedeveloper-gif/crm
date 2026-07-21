package com.salecrm.crmhistory.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.common.web.PageResponse;
import com.salecrm.crmhistory.dto.CrmHistoryFilter;
import com.salecrm.crmhistory.dto.CrmHistoryRequest;
import com.salecrm.crmhistory.dto.CrmHistoryResponse;
import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.service.CrmHistoryService;
import com.salecrm.crmhistory.service.CrmHistoryExcelExportService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/crm-history")
@RequiredArgsConstructor
public class CrmHistoryController {

    private final CrmHistoryService crmHistoryService;
    private final CrmHistoryExcelExportService excelExportService;

    @GetMapping
    @PreAuthorize("@perm.can('CRM_VIEW')")
    public ApiResponse<PageResponse<CrmHistoryResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long townshipId
    ) {
        CrmHistoryFilter filter = new CrmHistoryFilter(branchId, search, actionType, phone, regionId, townshipId);
        return ApiResponse.ok(crmHistoryService.list(filter, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.can('CRM_VIEW')")
    public ApiResponse<CrmHistoryResponse> getById(@PathVariable Long id) {
        return ApiResponse.ok(crmHistoryService.getById(id));
    }

    @PostMapping
    @PreAuthorize("@perm.canEditCrm()")
    public ResponseEntity<ApiResponse<CrmHistoryResponse>> create(@Valid @RequestBody CrmHistoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(crmHistoryService.create(request), "Created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.canEditCrm()")
    public ApiResponse<CrmHistoryResponse> update(@PathVariable Long id,
                                                   @Valid @RequestBody CrmHistoryRequest request) {
        return ApiResponse.ok(crmHistoryService.update(id, request), "Updated");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.canEditCrm()")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        crmHistoryService.delete(id);
        return ApiResponse.ok(null, "Deleted");
    }

    @GetMapping("/export")
    @PreAuthorize("@perm.can('CRM_EXPORT')")
    public void exportExcel(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long townshipId,
            HttpServletResponse response
    ) throws IOException {
        CrmHistoryFilter filter = new CrmHistoryFilter(branchId, search, actionType, phone, regionId, townshipId);
        List<CrmHistoryResponse> data = excelExportService.listForExport(filter);
        excelExportService.export(data, response);
    }
}
