package com.salecrm.auth.controller;

import com.salecrm.auth.AuthService;
import com.salecrm.auth.dto.AuthResponse;
import com.salecrm.auth.dto.LoginRequest;
import com.salecrm.auth.dto.RefreshRequest;
import com.salecrm.common.web.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request), "Login successful");
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request), "Token refreshed");
    }
}
