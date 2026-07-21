package com.salecrm.performance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record UpdateStaffTargetRequest(
        @NotBlank String staffKey,
        Long branchId,
        @NotNull Map<String, Integer> targets
) {
}
