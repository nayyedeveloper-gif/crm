package com.salecrm.user.dto;

import java.time.Instant;

public record UserResponse(
        Long id,
        String username,
        String fullName,
        String role,
        Long branchId,
        String branchName,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
