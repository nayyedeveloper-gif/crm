package com.salecrm.user.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.user.dto.ChangePasswordRequest;
import com.salecrm.user.dto.ProfileUpdateRequest;
import com.salecrm.user.dto.UserResponse;
import com.salecrm.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users/me")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping
    public ApiResponse<UserResponse> me() {
        return ApiResponse.ok(userProfileService.me());
    }

    @PutMapping
    public ApiResponse<UserResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        return ApiResponse.ok(userProfileService.updateProfile(request), "Profile updated");
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userProfileService.changePassword(request);
        return ApiResponse.ok(null, "Password changed");
    }
}
