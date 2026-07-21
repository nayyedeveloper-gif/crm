package com.salecrm.permission.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.permission.dto.PermissionMatrixResponse;
import com.salecrm.permission.dto.PermissionUpdateRequest;
import com.salecrm.permission.service.PermissionAccessService;
import com.salecrm.permission.service.PermissionService;
import com.salecrm.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/settings/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;
    private final PermissionAccessService permissionAccessService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Map<String, String>> myPermissions(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal p) {
            return ApiResponse.ok(permissionAccessService.levelsForPrincipal(p));
        }
        return ApiResponse.ok(permissionAccessService.levelsForRole("STAFF"));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PermissionMatrixResponse> get() {
        return ApiResponse.ok(permissionService.getMatrix());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PermissionMatrixResponse> update(
            @Valid @RequestBody PermissionUpdateRequest request) {
        return ApiResponse.ok(permissionService.update(request), "Permissions saved");
    }
}
