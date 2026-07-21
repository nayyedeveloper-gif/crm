package com.salecrm.permission.dto;

import java.util.List;
import java.util.Map;

public record PermissionMatrixResponse(
        List<String> permissionKeys,
        Map<String, String> labels,
        List<String> roles,
        /** key = permissionKey, value = map role -> accessLevel */
        Map<String, Map<String, String>> matrix
) {
}
