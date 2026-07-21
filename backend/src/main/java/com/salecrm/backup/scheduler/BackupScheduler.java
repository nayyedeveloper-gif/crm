package com.salecrm.backup.scheduler;

import com.salecrm.backup.service.BackupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BackupScheduler {

    private final BackupService backupService;

    /** Check every 5 minutes whether an auto backup is due. */
    @Scheduled(cron = "0 */5 * * * *", zone = "Asia/Yangon")
    public void tick() {
        try {
            backupService.runAutoBackupIfDue();
        } catch (Exception ex) {
            log.warn("Auto backup check failed: {}", ex.getMessage());
        }
    }
}
