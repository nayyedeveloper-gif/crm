package com.salecrm.backup.repository;

import com.salecrm.backup.entity.BackupJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BackupJobRepository extends JpaRepository<BackupJob, Long> {
    List<BackupJob> findTop50ByOrderByCreatedAtDesc();
}
