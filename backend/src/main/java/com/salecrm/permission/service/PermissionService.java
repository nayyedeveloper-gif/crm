package com.salecrm.permission.service;

import com.salecrm.common.exception.BusinessException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.permission.PermissionCatalog;
import com.salecrm.permission.dto.PermissionMatrixResponse;
import com.salecrm.permission.dto.PermissionUpdateRequest;
import com.salecrm.permission.entity.RolePermission;
import com.salecrm.permission.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private static final List<String> ROLES = List.of("ADMIN", "MANAGER", "STAFF");

    private final RolePermissionRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public PermissionMatrixResponse getMatrix() {
        Map<String, Map<String, String>> matrix = new LinkedHashMap<>();
        for (String key : PermissionCatalog.KEYS) {
            Map<String, String> row = new LinkedHashMap<>();
            for (String role : ROLES) {
                row.put(role, "NONE");
            }
            matrix.put(key, row);
        }
        for (RolePermission rp : repository.findAllByOrderByPermissionKeyAscRoleAsc()) {
            Map<String, String> row = matrix.get(rp.getPermissionKey());
            if (row != null) {
                row.put(rp.getRole(), rp.getAccessLevel());
            }
        }
        return new PermissionMatrixResponse(
                PermissionCatalog.KEYS,
                PermissionCatalog.LABELS,
                ROLES,
                matrix
        );
    }

    @Transactional
    public PermissionMatrixResponse update(PermissionUpdateRequest request) {
        StringBuilder detail = new StringBuilder();
        for (PermissionUpdateRequest.PermissionCell cell : request.cells()) {
            String key = cell.permissionKey().trim().toUpperCase();
            String role = cell.role().trim().toUpperCase();
            String level = cell.accessLevel().trim().toUpperCase();

            if (!PermissionCatalog.KEYS.contains(key)) {
                throw new BusinessException("Unknown permission: " + key);
            }
            if (!ROLES.contains(role)) {
                throw new BusinessException("Unknown role: " + role);
            }
            if (!PermissionCatalog.LEVELS.contains(level)) {
                throw new BusinessException("Invalid access level: " + level);
            }
            if ("ADMIN".equals(role) && PermissionCatalog.ADMIN_LOCKED.contains(key)) {
                level = "ALLOW";
            }
            if ("CRM_EDIT".equals(key) && !"OWN".equals(level) && !"ALLOW".equals(level) && !"NONE".equals(level)) {
                throw new BusinessException("CRM_EDIT level must be NONE, ALLOW, or OWN");
            }
            if (!"CRM_EDIT".equals(key) && "OWN".equals(level)) {
                // OWN only meaningful for CRM_EDIT; coerce to ALLOW
                level = "ALLOW";
            }

            RolePermission rp = repository.findByPermissionKeyAndRole(key, role)
                    .orElse(RolePermission.builder()
                            .permissionKey(key)
                            .role(role)
                            .accessLevel(level)
                            .build());
            String before = rp.getId() == null ? "NONE" : rp.getAccessLevel();
            rp.setAccessLevel(level);
            repository.save(rp);
            if (!before.equals(level)) {
                detail.append("%s/%s: %s → %s; ".formatted(key, role, before, level));
            }
        }
        auditLogService.change("PERMISSIONS", "UPDATE", "Permission matrix updated",
                detail.isEmpty() ? "No effective changes" : detail.toString());
        auditLogService.system("INFO", "permissions", "Permission matrix saved", null);
        return getMatrix();
    }
}
