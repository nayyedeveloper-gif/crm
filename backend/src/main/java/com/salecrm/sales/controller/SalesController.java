package com.salecrm.sales.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.sales.dto.SalesImportResult;
import com.salecrm.sales.dto.SalesStatusResponse;
import com.salecrm.sales.dto.SalesTargetSheetResponse;
import com.salecrm.sales.dto.SalesTransactionCreateRequest;
import com.salecrm.sales.service.SalesExportService;
import com.salecrm.sales.service.SalesImportService;
import com.salecrm.sales.service.SalesService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sales")
@RequiredArgsConstructor
public class SalesController {

    private final SalesService salesService;
    private final SalesImportService importService;
    private final SalesExportService exportService;

    @GetMapping("/transactions")
    @PreAuthorize("@perm.can('SALES_VIEW')")
    public ApiResponse<List<Map<String, Object>>> listTransactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok(salesService.listTransactions(from, to));
    }

    @PostMapping("/transactions")
    @PreAuthorize("@perm.can('SALES_IMPORT')")
    public ApiResponse<Map<String, Object>> createTransaction(
            @RequestBody SalesTransactionCreateRequest request
    ) {
        return ApiResponse.ok(salesService.createTransaction(request), "Created");
    }

    @GetMapping("/targets")
    @PreAuthorize("@perm.can('SALES_VIEW')")
    public ApiResponse<SalesTargetSheetResponse> targets(
            @RequestParam(required = false) String month
    ) {
        return ApiResponse.ok(salesService.getTargets(month));
    }

    @GetMapping("/status")
    @PreAuthorize("@perm.can('SALES_VIEW')")
    public ApiResponse<SalesStatusResponse> status() {
        return ApiResponse.ok(salesService.status());
    }

    @PostMapping(value = "/import/transactions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@perm.can('SALES_IMPORT')")
    public ApiResponse<SalesImportResult> importTransactions(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "true") boolean replaceAll
    ) {
        return ApiResponse.ok(importService.importTransactions(file, replaceAll), "Import complete");
    }

    @PostMapping(value = "/import/targets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@perm.can('SALES_IMPORT')")
    public ApiResponse<SalesImportResult> importTargets(
            @RequestParam("file") MultipartFile file,
            @RequestParam String month,
            @RequestParam(defaultValue = "true") boolean replaceMonth
    ) {
        return ApiResponse.ok(importService.importTargets(file, month, replaceMonth), "Import complete");
    }

    @GetMapping("/export/transactions")
    @PreAuthorize("@perm.can('SALES_IMPORT')")
    public void exportTransactions(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"sales-transactions.csv\"");
        exportService.exportTransactions(response.getOutputStream());
    }
}
