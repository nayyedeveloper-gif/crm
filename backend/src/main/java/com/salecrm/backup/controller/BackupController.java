package com.salecrm.backup.controller;

import com.salecrm.backup.dto.BackupJobResponse;
import com.salecrm.backup.dto.BackupSettingsResponse;
import com.salecrm.backup.dto.BackupSettingsUpdateRequest;
import com.salecrm.backup.service.BackupService;
import com.salecrm.common.web.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/settings/backup")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SuppressWarnings("null")
public class BackupController {

    private final BackupService backupService;

    @GetMapping("/config")
    public ApiResponse<BackupSettingsResponse> getConfig() {
        return ApiResponse.ok(backupService.getSettings());
    }

    @PutMapping("/config")
    public ApiResponse<BackupSettingsResponse> updateConfig(
            @Valid @RequestBody BackupSettingsUpdateRequest request) {
        return ApiResponse.ok(backupService.updateSettings(request), "Backup settings saved");
    }

    @GetMapping("/jobs")
    public ApiResponse<List<BackupJobResponse>> listJobs() {
        return ApiResponse.ok(backupService.listJobs());
    }

    @PostMapping("/run")
    public ApiResponse<BackupJobResponse> runManual() {
        return ApiResponse.ok(backupService.runManualBackup(), "Backup started");
    }

    @GetMapping("/jobs/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        Resource resource = backupService.loadBackupFile(id);
        String filename = resource.getFilename() != null ? resource.getFilename() : "backup.json";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(resource);
    }
}
