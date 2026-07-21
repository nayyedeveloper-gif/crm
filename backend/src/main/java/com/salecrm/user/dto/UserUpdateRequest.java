package com.salecrm.user.dto;

import com.salecrm.user.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
        @NotBlank @Size(max = 160) String fullName,
        @NotNull Role role,
        Long branchId,
        @NotNull Boolean active,
        @Size(min = 8, max = 100) String password
) {
}
