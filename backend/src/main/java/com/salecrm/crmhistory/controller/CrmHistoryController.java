package com.salecrm.crmhistory.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.common.web.PageResponse;
import com.salecrm.crmhistory.dto.CrmHistoryFilter;
import com.salecrm.crmhistory.dto.CrmHistoryRequest;
import com.salecrm.crmhistory.dto.CrmHistoryResponse;
import com.salecrm.crmhistory.entity.ActionType;
import com.salecrm.crmhistory.entity.InviteStatus;
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
            @RequestParam(name = "branch_id", required = false) Long branchIdLegacy,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) InviteStatus inviteStatus,
            @RequestParam(name = "invite_status", required = false) String inviteStatusLegacy,
            @RequestParam(required = false) String phone,
            @RequestParam(name = "phone_number", required = false) String phoneLegacy,
            @RequestParam(required = false) Long regionId,
            @RequestParam(name = "region_id", required = false) Long regionIdLegacy,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(name = "township_id", required = false) Long townshipIdLegacy
    ) {
        CrmHistoryFilter filter = buildFilter(
                branchId, branchIdLegacy, search, actionType, inviteStatus, inviteStatusLegacy,
                phone, phoneLegacy, regionId, regionIdLegacy, townshipId, townshipIdLegacy);
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
            @RequestParam(name = "branch_id", required = false) Long branchIdLegacy,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) InviteStatus inviteStatus,
            @RequestParam(name = "invite_status", required = false) String inviteStatusLegacy,
            @RequestParam(required = false) String phone,
            @RequestParam(name = "phone_number", required = false) String phoneLegacy,
            @RequestParam(required = false) Long regionId,
            @RequestParam(name = "region_id", required = false) Long regionIdLegacy,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(name = "township_id", required = false) Long townshipIdLegacy,
            HttpServletResponse response
    ) throws IOException {
        CrmHistoryFilter filter = buildFilter(
                branchId, branchIdLegacy, search, actionType, inviteStatus, inviteStatusLegacy,
                phone, phoneLegacy, regionId, regionIdLegacy, townshipId, townshipIdLegacy);
        List<CrmHistoryResponse> data = excelExportService.listForExport(filter);
        excelExportService.export(data, response);
    }

    private static CrmHistoryFilter buildFilter(
            Long branchId,
            Long branchIdLegacy,
            String search,
            ActionType actionType,
            InviteStatus inviteStatus,
            String inviteStatusLegacy,
            String phone,
            String phoneLegacy,
            Long regionId,
            Long regionIdLegacy,
            Long townshipId,
            Long townshipIdLegacy
    ) {
        Long effectiveBranchId = branchId != null ? branchId : branchIdLegacy;
        InviteStatus effectiveInvite = inviteStatus != null
                ? inviteStatus
                : InviteStatus.parseQueryParam(inviteStatusLegacy);
        String effectivePhone = phone != null ? phone : phoneLegacy;
        Long effectiveRegionId = regionId != null ? regionId : regionIdLegacy;
        Long effectiveTownshipId = townshipId != null ? townshipId : townshipIdLegacy;
        return new CrmHistoryFilter(
                effectiveBranchId, search, actionType, effectiveInvite, effectivePhone,
                effectiveRegionId, effectiveTownshipId);
    }
}
