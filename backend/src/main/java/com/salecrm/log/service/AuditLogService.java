package com.salecrm.log.service;

import com.salecrm.log.dto.ChangeLogResponse;
import com.salecrm.log.dto.SystemLogResponse;
import com.salecrm.log.entity.ChangeLog;
import com.salecrm.log.entity.SystemLog;
import com.salecrm.log.repository.ChangeLogRepository;
import com.salecrm.log.repository.SystemLogRepository;
import com.salecrm.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AuditLogService {

    private final ChangeLogRepository changeLogRepository;
    private final SystemLogRepository systemLogRepository;

    @Transactional
    public void change(String category, String action, String summary, String detail) {
        String actor = SecurityUtils.currentUser()
                .map(u -> u.getUsername())
                .orElse("system");
        changeLogRepository.save(ChangeLog.builder()
                .category(category)
                .action(action)
                .summary(trim(summary, 500))
                .detail(detail)
                .actor(actor)
                .build());
    }

    @Transactional
    public void system(String level, String source, String message, String detail) {
        systemLogRepository.save(SystemLog.builder()
                .level(level == null ? "INFO" : level.toUpperCase())
                .source(trim(source, 80))
                .message(trim(message, 1000))
                .detail(detail)
                .build());
    }

    @Transactional(readOnly = true)
    public List<ChangeLogResponse> listChangeLogs() {
        return changeLogRepository.findTop200ByOrderByCreatedAtDesc().stream()
                .map(c -> new ChangeLogResponse(
                        c.getId(), c.getCategory(), c.getAction(), c.getSummary(),
                        c.getDetail(), c.getActor(), c.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SystemLogResponse> listSystemLogs() {
        return systemLogRepository.findTop200ByOrderByCreatedAtDesc().stream()
                .map(s -> new SystemLogResponse(
                        s.getId(), s.getLevel(), s.getSource(), s.getMessage(),
                        s.getDetail(), s.getCreatedAt()))
                .toList();
    }

    private static String trim(String value, int max) {
        if (value == null) return null;
        return value.length() > max ? value.substring(0, max) : value;
    }
}
