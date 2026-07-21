package com.salecrm.permission.service;

import com.salecrm.permission.PermissionCatalog;
import com.salecrm.permission.entity.RolePermission;
import com.salecrm.permission.repository.RolePermissionRepository;
import com.salecrm.security.UserPrincipal;
import com.salecrm.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service("perm")
@RequiredArgsConstructor
public class PermissionAccessService {

    private final RolePermissionRepository repository;

    @Transactional(readOnly = true)
    public boolean can(String permissionKey) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            return false;
        }
        return hasAllow(principal.getRole().name(), permissionKey);
    }

    @Transactional(readOnly = true)
    public boolean canAny(String... permissionKeys) {
        if (permissionKeys == null) {
            return false;
        }
        for (String key : permissionKeys) {
            if (can(key)) {
                return true;
            }
        }
        return false;
    }

    @Transactional(readOnly = true)
    public boolean canEditCrm() {
        return hasLevel("CRM_EDIT", "ALLOW", "OWN");
    }

    @Transactional(readOnly = true)
    public boolean hasLevel(String permissionKey, String... allowedLevels) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            return false;
        }
        String key = permissionKey == null ? "" : permissionKey.trim().toUpperCase();
        if (!PermissionCatalog.KEYS.contains(key)) {
            return false;
        }
        String level = repository.findByPermissionKeyAndRole(key, principal.getRole().name())
                .map(RolePermission::getAccessLevel)
                .orElse("NONE");
        for (String allowed : allowedLevels) {
            if (allowed != null && allowed.equalsIgnoreCase(level)) {
                return true;
            }
        }
        return false;
    }

    @Transactional(readOnly = true)
    public boolean hasAllow(String role, String permissionKey) {
        if (role == null || permissionKey == null) {
            return false;
        }
        String key = permissionKey.trim().toUpperCase();
        String roleName = role.trim().toUpperCase();
        if (!PermissionCatalog.KEYS.contains(key)) {
            return false;
        }
        return repository.findByPermissionKeyAndRole(key, roleName)
                .map(RolePermission::getAccessLevel)
                .map(level -> "ALLOW".equalsIgnoreCase(level) || "OWN".equalsIgnoreCase(level))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public Map<String, String> levelsForPrincipal(UserPrincipal principal) {
        Map<String, String> out = levelsForRole(principal.getRole().name());
        if (principal.isCrossBranch()) {
            out.put("BRANCH_ALL", "ALLOW");
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, String> levelsForRole(String role) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String key : PermissionCatalog.KEYS) {
            out.put(key, "NONE");
        }
        if (role == null) {
            return out;
        }
        String roleName = role.trim().toUpperCase();
        for (RolePermission rp : repository.findAllByOrderByPermissionKeyAscRoleAsc()) {
            if (roleName.equalsIgnoreCase(rp.getRole()) && out.containsKey(rp.getPermissionKey())) {
                out.put(rp.getPermissionKey(), rp.getAccessLevel());
            }
        }
        return out;
    }
}
