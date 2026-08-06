package com.salecrm.crmhistory.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.common.web.PageResponse;
import com.salecrm.crmhistory.dto.CrmHistoryFilter;
import com.salecrm.crmhistory.dto.CrmHistoryAmountSummary;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/crm-history")
@RequiredArgsConstructor
public class CrmHistoryController {
    private static final ZoneId YANGON = ZoneId.of("Asia/Yangon");

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
            @RequestParam(required = false) String createdBy,
            @RequestParam(name = "created_by", required = false) String createdByLegacy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(name = "from_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDateLegacy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(name = "to_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDateLegacy,
            @RequestParam(required = false) String amountBucket,
            @RequestParam(name = "amount_bucket", required = false) String amountBucketLegacy,
            @RequestParam(required = false) Long regionId,
            @RequestParam(name = "region_id", required = false) Long regionIdLegacy,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(name = "township_id", required = false) Long townshipIdLegacy
    ) {
        CrmHistoryFilter filter = buildFilter(
                branchId, branchIdLegacy, search, actionType, inviteStatus, inviteStatusLegacy,
                phone, phoneLegacy, createdBy, createdByLegacy,
                fromDate, fromDateLegacy, toDate, toDateLegacy,
                amountBucket, amountBucketLegacy,
                regionId, regionIdLegacy, townshipId, townshipIdLegacy);
        return ApiResponse.ok(crmHistoryService.list(filter, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.can('CRM_VIEW')")
    public ApiResponse<CrmHistoryResponse> getById(@PathVariable Long id) {
        return ApiResponse.ok(crmHistoryService.getById(id));
    }

    @GetMapping("/amount-summary")
    @PreAuthorize("@perm.can('CRM_VIEW')")
    public ApiResponse<CrmHistoryAmountSummary> amountSummary(
            @RequestParam(required = false) Long branchId,
            @RequestParam(name = "branch_id", required = false) Long branchIdLegacy,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ActionType actionType,
            @RequestParam(required = false) InviteStatus inviteStatus,
            @RequestParam(name = "invite_status", required = false) String inviteStatusLegacy,
            @RequestParam(required = false) String phone,
            @RequestParam(name = "phone_number", required = false) String phoneLegacy,
            @RequestParam(required = false) String createdBy,
            @RequestParam(name = "created_by", required = false) String createdByLegacy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(name = "from_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDateLegacy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(name = "to_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDateLegacy,
            @RequestParam(required = false) Long regionId,
            @RequestParam(name = "region_id", required = false) Long regionIdLegacy,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(name = "township_id", required = false) Long townshipIdLegacy
    ) {
        CrmHistoryFilter filter = buildFilter(
                branchId, branchIdLegacy, search, actionType, inviteStatus, inviteStatusLegacy,
                phone, phoneLegacy, createdBy, createdByLegacy,
                fromDate, fromDateLegacy, toDate, toDateLegacy,
                null, null,
                regionId, regionIdLegacy, townshipId, townshipIdLegacy);
        return ApiResponse.ok(crmHistoryService.amountSummary(filter));
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
            @RequestParam(required = false) String createdBy,
            @RequestParam(name = "created_by", required = false) String createdByLegacy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(name = "from_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDateLegacy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(name = "to_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDateLegacy,
            @RequestParam(required = false) String amountBucket,
            @RequestParam(name = "amount_bucket", required = false) String amountBucketLegacy,
            @RequestParam(required = false) Long regionId,
            @RequestParam(name = "region_id", required = false) Long regionIdLegacy,
            @RequestParam(required = false) Long townshipId,
            @RequestParam(name = "township_id", required = false) Long townshipIdLegacy,
            HttpServletResponse response
    ) throws IOException {
        CrmHistoryFilter filter = buildFilter(
                branchId, branchIdLegacy, search, actionType, inviteStatus, inviteStatusLegacy,
                phone, phoneLegacy, createdBy, createdByLegacy,
                fromDate, fromDateLegacy, toDate, toDateLegacy,
                amountBucket, amountBucketLegacy,
                regionId, regionIdLegacy, townshipId, townshipIdLegacy);
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
            String createdBy,
            String createdByLegacy,
            LocalDate fromDate,
            LocalDate fromDateLegacy,
            LocalDate toDate,
            LocalDate toDateLegacy,
            String amountBucket,
            String amountBucketLegacy,
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
        String effectiveCreatedBy = createdBy != null ? createdBy : createdByLegacy;
        LocalDate effectiveFrom = fromDate != null ? fromDate : fromDateLegacy;
        LocalDate effectiveTo = toDate != null ? toDate : toDateLegacy;
        String effectiveAmountBucket = amountBucket != null ? amountBucket : amountBucketLegacy;
        Long effectiveRegionId = regionId != null ? regionId : regionIdLegacy;
        Long effectiveTownshipId = townshipId != null ? townshipId : townshipIdLegacy;
        Instant createdFromTs = effectiveFrom != null ? effectiveFrom.atStartOfDay(YANGON).toInstant() : null;
        Instant createdToTs = effectiveTo != null ? effectiveTo.plusDays(1).atStartOfDay(YANGON).toInstant() : null;
        return new CrmHistoryFilter(
                effectiveBranchId, search, actionType, effectiveInvite, effectivePhone,
                effectiveCreatedBy, createdFromTs, createdToTs, effectiveAmountBucket,
                effectiveRegionId, effectiveTownshipId);
    }
}
