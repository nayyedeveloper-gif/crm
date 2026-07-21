package com.salecrm.user.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.user.dto.UserCreateRequest;
import com.salecrm.user.dto.UserResponse;
import com.salecrm.user.dto.UserUpdateRequest;
import com.salecrm.user.service.UserAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserAdminService userAdminService;

    @GetMapping
    public ApiResponse<List<UserResponse>> list() {
        return ApiResponse.ok(userAdminService.listAll());
    }

    @PostMapping
    public ApiResponse<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        return ApiResponse.ok(userAdminService.create(request), "User created");
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request) {
        return ApiResponse.ok(userAdminService.update(id, request), "User updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        userAdminService.delete(id);
        return ApiResponse.ok(null, "User deleted");
    }
}
