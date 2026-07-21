package com.salecrm.branch.dto;

public record BranchResponse(
        Long id,
        String code,
        String name,
        String phone,
        String address,
        boolean active
) {
}
