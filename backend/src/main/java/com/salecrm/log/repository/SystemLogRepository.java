package com.salecrm.log.repository;

import com.salecrm.log.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
    List<SystemLog> findTop200ByOrderByCreatedAtDesc();
}
