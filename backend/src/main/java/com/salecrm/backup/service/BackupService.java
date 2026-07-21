package com.salecrm.backup.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salecrm.backup.dto.BackupJobResponse;
import com.salecrm.backup.dto.BackupSettingsResponse;
import com.salecrm.backup.dto.BackupSettingsUpdateRequest;
import com.salecrm.backup.entity.BackupJob;
import com.salecrm.backup.entity.BackupSettings;
import com.salecrm.backup.repository.BackupJobRepository;
import com.salecrm.backup.repository.BackupSettingsRepository;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.crmhistory.dto.CrmHistoryResponse;
import com.salecrm.crmhistory.service.CrmHistoryExcelExportService;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class BackupService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Yangon");
    private static final Set<String> FREQUENCIES = Set.of("DAILY", "WEEKLY");
    private static final Set<String> DESTINATIONS = Set.of("LOCAL", "GOOGLE_DRIVE", "OTHER");
    private static final DateTimeFormatter FILE_TS =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZONE);

    private final BackupSettingsRepository settingsRepository;
    private final BackupJobRepository jobRepository;
    private final CrmHistoryExcelExportService exportService;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    @Value("${app.backup.dir:./data/backups}")
    private String defaultBackupDir;

    @Transactional(readOnly = true)
    public BackupSettingsResponse getSettings() {
        return toSettingsResponse(requireSettings());
    }

    @Transactional
    public BackupSettingsResponse updateSettings(BackupSettingsUpdateRequest request) {
        String frequency = request.frequency().trim().toUpperCase();
        if (!FREQUENCIES.contains(frequency)) {
            throw new BusinessException("Frequency must be DAILY or WEEKLY");
        }
        String destType = request.destinationType().trim().toUpperCase();
        if (!DESTINATIONS.contains(destType)) {
            throw new BusinessException("Destination must be LOCAL, GOOGLE_DRIVE, or OTHER");
        }
        String path = request.destinationPath().trim();
        if (!StringUtils.hasText(path)) {
            throw new BusinessException("Destination path is required");
        }
        if ("GOOGLE_DRIVE".equals(destType) && !StringUtils.hasText(request.driveFolderId())) {
            throw new BusinessException("Google Drive folder ID is required");
        }

        BackupSettings settings = requireSettings();
        settings.setAutoEnabled(Boolean.TRUE.equals(request.autoEnabled()));
        settings.setFrequency(frequency);
        settings.setTimeOfDay(request.timeOfDay());
        settings.setRetainDays(request.retainDays());
        settings.setDestinationType(destType);
        settings.setDestinationPath(path);
        settings.setDriveFolderId(
                "GOOGLE_DRIVE".equals(destType) ? request.driveFolderId().trim() : null);

        BackupSettings saved = settingsRepository.save(settings);
        auditLogService.change("BACKUP", "UPDATE", "Backup settings updated",
                "dest=%s path=%s auto=%s".formatted(destType, path, saved.isAutoEnabled()));
        auditLogService.system("INFO", "backup", "Backup configuration saved (" + destType + ")", null);
        return toSettingsResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BackupJobResponse> listJobs() {
        return jobRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(this::toJobResponse)
                .toList();
    }

    @Transactional
    public BackupJobResponse runManualBackup() {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        BackupJobResponse result = runBackup("MANUAL", user.getUsername());
        auditLogService.change("BACKUP", "RUN", "Manual backup " + result.status(),
                result.filename() != null ? result.filename() : result.errorMessage());
        return result;
    }

    @Transactional
    public void runAutoBackupIfDue() {
        BackupSettings settings = requireSettings();
        if (!settings.isAutoEnabled()) {
            return;
        }
        LocalTime now = LocalTime.now(ZONE);
        LocalTime target = settings.getTimeOfDay();
        if (now.isBefore(target) || now.isAfter(target.plusMinutes(15))) {
            return;
        }
        Instant last = settings.getLastAutoRunAt();
        if (last != null) {
            LocalDate lastDate = last.atZone(ZONE).toLocalDate();
            LocalDate today = LocalDate.now(ZONE);
            if ("DAILY".equals(settings.getFrequency()) && lastDate.equals(today)) {
                return;
            }
            if ("WEEKLY".equals(settings.getFrequency())
                    && !lastDate.isBefore(today.minusDays(6))) {
                return;
            }
        }
        BackupJobResponse result = runBackup("AUTO", "system");
        if ("SUCCESS".equals(result.status())) {
            settings.setLastAutoRunAt(Instant.now());
            settingsRepository.save(settings);
            pruneOldBackups(settings);
            auditLogService.system("INFO", "backup", "Auto backup completed", result.filename());
        } else {
            auditLogService.system("ERROR", "backup", "Auto backup failed", result.errorMessage());
        }
    }

    @Transactional(readOnly = true)
    public Resource loadBackupFile(Long jobId) {
        BackupJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("BackupJob", jobId));
        if (!"SUCCESS".equals(job.getStatus()) || job.getFilename() == null) {
            throw new BusinessException("Backup file is not available", HttpStatus.NOT_FOUND);
        }
        Path dir = resolveWriteDir(job.getDestinationPath(), job.getDestinationType()).toAbsolutePath().normalize();
        Path path = dir.resolve(job.getFilename()).normalize();
        if (!path.startsWith(dir) || !Files.isRegularFile(path)) {
            throw new BusinessException("Backup file missing on disk", HttpStatus.NOT_FOUND);
        }
        return new FileSystemResource(path);
    }

    private BackupJobResponse runBackup(String jobType, String triggeredBy) {
        BackupSettings settings = requireSettings();
        String destType = settings.getDestinationType() != null ? settings.getDestinationType() : "LOCAL";
        String destPath = settings.getDestinationPath() != null
                ? settings.getDestinationPath()
                : defaultBackupDir;

        BackupJob job = BackupJob.builder()
                .jobType(jobType)
                .status("RUNNING")
                .triggeredBy(triggeredBy)
                .destinationType(destType)
                .destinationPath(destPath)
                .build();
        job = jobRepository.save(job);

        try {
            Path dir = resolveWriteDir(destPath, destType);
            Files.createDirectories(dir);

            List<CrmHistoryResponse> records = exportService.listAllForBackup();

            String filename = "crm-backup-%s.json".formatted(FILE_TS.format(Instant.now()));
            Path file = dir.resolve(filename);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("exportedAt", Instant.now().toString());
            payload.put("timezone", ZONE.getId());
            payload.put("jobType", jobType);
            payload.put("triggeredBy", triggeredBy);
            payload.put("destinationType", destType);
            payload.put("destinationPath", destPath);
            if ("GOOGLE_DRIVE".equals(destType)) {
                payload.put("driveFolderId", settings.getDriveFolderId());
                payload.put("driveNote",
                        "File written to local staging path. Connect Google Drive API to upload to folder "
                                + settings.getDriveFolderId());
            }
            payload.put("recordCount", records.size());
            payload.put("records", records);

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), payload);
            long size = Files.size(file);

            job.setStatus("SUCCESS");
            job.setFilename(filename);
            job.setSizeBytes(size);
            job.setRecordCount(records.size());
            job.setErrorMessage(null);

            if ("GOOGLE_DRIVE".equals(destType)) {
                auditLogService.system("WARN", "backup",
                        "Backup staged locally for Drive folder " + settings.getDriveFolderId(),
                        file.toAbsolutePath().toString());
            }
        } catch (Exception ex) {
            log.error("Backup failed ({})", jobType, ex);
            job.setStatus("FAILED");
            job.setErrorMessage(trimError(ex.getMessage()));
            auditLogService.system("ERROR", "backup", "Backup failed", ex.getMessage());
        }

        return toJobResponse(jobRepository.save(job));
    }

    /**
     * LOCAL/OTHER write to destinationPath.
     * GOOGLE_DRIVE stages under destinationPath (or default) until Drive upload is wired.
     */
    private Path resolveWriteDir(String destinationPath, String destinationType) {
        String path = StringUtils.hasText(destinationPath) ? destinationPath : defaultBackupDir;
        if ("GOOGLE_DRIVE".equals(destinationType) && !StringUtils.hasText(destinationPath)) {
            path = defaultBackupDir + "/drive-staging";
        }
        return Path.of(path);
    }

    private void pruneOldBackups(BackupSettings settings) {
        Instant cutoff = Instant.now().minusSeconds(settings.getRetainDays() * 86_400L);
        Path dir = resolveWriteDir(settings.getDestinationPath(), settings.getDestinationType());
        List<BackupJob> jobs = jobRepository.findTop50ByOrderByCreatedAtDesc();
        for (BackupJob job : jobs) {
            if (job.getCreatedAt() != null && job.getCreatedAt().isBefore(cutoff)
                    && job.getFilename() != null) {
                try {
                    Files.deleteIfExists(dir.resolve(job.getFilename()));
                } catch (IOException ignored) {
                    // best-effort cleanup
                }
            }
        }
    }

    private BackupSettings requireSettings() {
        return settingsRepository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("BackupSettings", 1));
    }

    private BackupSettingsResponse toSettingsResponse(BackupSettings s) {
        return new BackupSettingsResponse(
                s.isAutoEnabled(),
                s.getFrequency(),
                s.getTimeOfDay(),
                s.getRetainDays(),
                s.getLastAutoRunAt(),
                s.getDestinationType(),
                s.getDestinationPath(),
                s.getDriveFolderId()
        );
    }

    private BackupJobResponse toJobResponse(BackupJob job) {
        return new BackupJobResponse(
                job.getId(),
                job.getJobType(),
                job.getStatus(),
                job.getFilename(),
                job.getSizeBytes(),
                job.getRecordCount(),
                job.getErrorMessage(),
                job.getTriggeredBy(),
                job.getCreatedAt(),
                job.getDestinationType(),
                job.getDestinationPath()
        );
    }

    private static String trimError(String message) {
        if (message == null) return "Unknown error";
        return message.length() > 900 ? message.substring(0, 900) : message;
    }
}
