package com.salecrm.log.repository;

import com.salecrm.log.entity.ChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChangeLogRepository extends JpaRepository<ChangeLog, Long> {
    List<ChangeLog> findTop200ByOrderByCreatedAtDesc();
}
