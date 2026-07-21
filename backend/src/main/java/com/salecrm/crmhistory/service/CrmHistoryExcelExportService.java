package com.salecrm.crmhistory.service;

import com.salecrm.crmhistory.dto.CrmHistoryFilter;
import com.salecrm.crmhistory.dto.CrmHistoryResponse;
import com.salecrm.crmhistory.dto.CrmHistorySpec;
import com.salecrm.crmhistory.repository.CrmHistoryRepository;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Exports CRM history records to Excel (.xlsx) format using Apache POI.
 */
@Service
@RequiredArgsConstructor
public class CrmHistoryExcelExportService {

    private final CrmHistoryRepository crmHistoryRepository;
    private final CrmHistoryService crmHistoryService;

    @Transactional(readOnly = true)
    public List<CrmHistoryResponse> listForExport(CrmHistoryFilter filter) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        Long effectiveBranchId = user.isCrossBranch() ? filter.branchId() : user.getBranchId();
        CrmHistoryFilter scopedFilter = new CrmHistoryFilter(
                effectiveBranchId, filter.search(), filter.actionType(),
                filter.phone(), filter.regionId(), filter.townshipId()
        );
        return listWithFilter(scopedFilter);
    }

    /** Unscoped dump for system backup jobs (ADMIN / scheduler only). */
    @Transactional(readOnly = true)
    public List<CrmHistoryResponse> listAllForBackup() {
        return listWithFilter(new CrmHistoryFilter(null, null, null, null, null, null));
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
            String[] headers = {"No.", "Customer Name", "Phone", "Birthday", "Amount",
                    "Action", "Branch", "Region", "Township", "Address", "Remark",
                    "Created At", "Created By"};
            for (int i = 0; i < headers.length; i++) {
                var cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            for (int i = 0; i < data.size(); i++) {
                var row = sheet.createRow(i + 1);
                var d = data.get(i);
                int col = 0;
                row.createCell(col++).setCellValue(i + 1);
                row.createCell(col++).setCellValue(nullSafe(d.customerName()));
                row.createCell(col++).setCellValue(nullSafe(d.phone()));
                row.createCell(col++).setCellValue(d.birthday() != null ? d.birthday().toString() : "");
                row.createCell(col++).setCellValue(d.amount() != null ? d.amount().doubleValue() : 0);
                row.createCell(col++).setCellValue(d.actionType() != null ? d.actionType().name() : "");
                row.createCell(col++).setCellValue(nullSafe(d.branchName()));
                row.createCell(col++).setCellValue(nullSafe(d.regionName()));
                row.createCell(col++).setCellValue(nullSafe(d.townshipName()));
                row.createCell(col++).setCellValue(nullSafe(d.address()));
                row.createCell(col++).setCellValue(nullSafe(d.remark()));
                row.createCell(col++).setCellValue(d.createdAt() != null ? d.createdAt().toString() : "");
                row.createCell(col).setCellValue(nullSafe(d.createdBy()));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
        }
    }

    private String nullSafe(String value) {
        return value != null ? value : "";
    }
}
