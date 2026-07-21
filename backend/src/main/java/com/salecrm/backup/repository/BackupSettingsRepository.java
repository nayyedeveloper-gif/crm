package com.salecrm.backup.repository;

import com.salecrm.backup.entity.BackupSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BackupSettingsRepository extends JpaRepository<BackupSettings, Long> {
}
