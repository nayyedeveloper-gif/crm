package com.salecrm.crmhistory.service;

import com.salecrm.crmhistory.dto.CrmHistoryFilter;
import com.salecrm.crmhistory.dto.CrmHistoryResponse;
import com.salecrm.crmhistory.dto.CrmHistorySpec;
import com.salecrm.crmhistory.dto.NrcLegacyParts;
import com.salecrm.crmhistory.repository.CrmHistoryRepository;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Exports CRM history records to Excel (.xlsx) format using Apache POI.
 * Column headers align with {@code database/crm_histories.csv} for legacy round-trip.
 */
@Service
@RequiredArgsConstructor
public class CrmHistoryExcelExportService {

    private static final ZoneId EXPORT_ZONE = ZoneId.of("Asia/Yangon");
    private static final DateTimeFormatter LEGACY_DATETIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(EXPORT_ZONE);

    private final CrmHistoryRepository crmHistoryRepository;
    private final CrmHistoryService crmHistoryService;

    @Transactional(readOnly = true)
    public List<CrmHistoryResponse> listForExport(CrmHistoryFilter filter) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        Long effectiveBranchId = user.isCrossBranch() ? filter.branchId() : user.getBranchId();
        CrmHistoryFilter scopedFilter = new CrmHistoryFilter(
                effectiveBranchId, filter.search(), filter.actionType(), filter.inviteStatus(),
                filter.phone(), filter.regionId(), filter.townshipId()
        );
        return listWithFilter(scopedFilter);
    }

    /** Unscoped dump for system backup jobs (ADMIN / scheduler only). */
    @Transactional(readOnly = true)
    public List<CrmHistoryResponse> listAllForBackup() {
        return listWithFilter(new CrmHistoryFilter(null, null, null, null, null, null, null));
    }

    private List<CrmHistoryResponse> listWithFilter(CrmHistoryFilter scopedFilter) {
        return crmHistoryRepository
                .findAll(CrmHistorySpec.withFilter(scopedFilter),
                        Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(crmHistoryService::toResponse)
                .toList();
    }

    public void export(List<CrmHistoryResponse> data, jakarta.servlet.http.HttpServletResponse response)
            throws java.io.IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=crm-history-export.xlsx");

        try (var workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             var out = response.getOutputStream()) {

            var sheet = workbook.createSheet("CRM History");

            var headerStyle = workbook.createCellStyle();
            var headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            var headerRow = sheet.createRow(0);
            String[] headers = {
                    "id", "branch_id", "created_by", "customer_name", "phone_number", "date_of_birth",
                    "nrc_state", "nrc_township_code", "nrc_type", "nrc_number",
                    "region_id", "township_id", "address", "customer_condition", "amount",
                    "invite_status", "remark", "created_at", "updated_at"
            };
            for (int i = 0; i < headers.length; i++) {
                var cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            for (int i = 0; i < data.size(); i++) {
                var row = sheet.createRow(i + 1);
                var d = data.get(i);
                NrcLegacyParts nrc = NrcLegacyParts.fromStoredNrc(d.nrc());
                int col = 0;
                setLong(row, col++, d.id());
                setLong(row, col++, d.branchId());
                setLongOrText(row, col++, d.legacyCreatedByUserId(), d.createdBy());
                row.createCell(col++).setCellValue(nullSafe(d.customerName()));
                row.createCell(col++).setCellValue(nullSafe(d.phone()));
                row.createCell(col++).setCellValue(d.birthday() != null ? d.birthday().toString() : "");
                row.createCell(col++).setCellValue(nullSafe(nrc.state()));
                row.createCell(col++).setCellValue(nullSafe(nrc.townshipCode()));
                row.createCell(col++).setCellValue(nullSafe(nrc.type()));
                row.createCell(col++).setCellValue(nullSafe(nrc.number()));
                setLong(row, col++, d.regionId());
                setLong(row, col++, d.townshipId());
                row.createCell(col++).setCellValue(nullSafe(d.address()));
                row.createCell(col++).setCellValue(nullSafe(d.customerCondition()));
                row.createCell(col++).setCellValue(d.amount() != null ? d.amount().doubleValue() : 0);
                row.createCell(col++).setCellValue(
                        d.inviteStatus() != null ? d.inviteStatus().toLegacyValue() : "");
                row.createCell(col++).setCellValue(nullSafe(d.remark()));
                row.createCell(col++).setCellValue(
                        d.createdAt() != null ? LEGACY_DATETIME.format(d.createdAt()) : "");
                row.createCell(col).setCellValue(
                        d.updatedAt() != null ? LEGACY_DATETIME.format(d.updatedAt()) : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
        }
    }

    private static void setLong(org.apache.poi.ss.usermodel.Row row, int col, Long value) {
        if (value != null) {
            row.createCell(col).setCellValue(value);
        } else {
            row.createCell(col).setCellValue("");
        }
    }

    private static void setLongOrText(
            org.apache.poi.ss.usermodel.Row row,
            int col,
            Long numeric,
            String textFallback
    ) {
        if (numeric != null) {
            row.createCell(col).setCellValue(numeric);
            return;
        }
        row.createCell(col).setCellValue(textFallback != null ? textFallback : "");
    }

    private String nullSafe(String value) {
        return value != null ? value : "";
    }
}
