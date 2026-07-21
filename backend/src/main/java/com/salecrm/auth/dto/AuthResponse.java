package com.salecrm.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        UserInfo user
) {
    public record UserInfo(
            Long id,
            String username,
            String fullName,
            String role,
            Long branchId,
            String branchName
    ) {
    }
}
