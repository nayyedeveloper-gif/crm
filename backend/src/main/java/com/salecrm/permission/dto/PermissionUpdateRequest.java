package com.salecrm.permission.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PermissionUpdateRequest(
        @NotEmpty List<PermissionCell> cells
) {
    public record PermissionCell(
            @NotNull String permissionKey,
            @NotNull String role,
            @NotNull String accessLevel
    ) {
    }
}
