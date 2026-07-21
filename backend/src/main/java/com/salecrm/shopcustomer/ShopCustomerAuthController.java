package com.salecrm.shopcustomer;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.security.SecurityUtils;
import com.salecrm.shopcustomer.dto.GoogleLoginRequest;
import com.salecrm.shopcustomer.dto.ShopAuthResponse;
import com.salecrm.shopcustomer.dto.ShopCustomerProfileRequest;
import com.salecrm.shopcustomer.dto.ShopCustomerResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/shop-auth")
@RequiredArgsConstructor
public class ShopCustomerAuthController {

    private final ShopCustomerAuthService authService;

    @PostMapping("/google")
    public ApiResponse<ShopAuthResponse> google(@Valid @RequestBody GoogleLoginRequest request) {
        return ApiResponse.ok(authService.loginWithGoogle(request));
    }

    @GetMapping("/me")
    public ApiResponse<ShopCustomerResponse> me(@AuthenticationPrincipal ShopCustomerPrincipal principal) {
        ShopCustomerPrincipal customer = SecurityUtils.requireShopCustomer(principal);
        return ApiResponse.ok(authService.me(customer.id()));
    }

    @PutMapping("/me/profile")
    public ApiResponse<ShopCustomerResponse> updateProfile(
            @AuthenticationPrincipal ShopCustomerPrincipal principal,
            @RequestBody ShopCustomerProfileRequest request) {
        ShopCustomerPrincipal customer = SecurityUtils.requireShopCustomer(principal);
        return ApiResponse.ok(authService.updateProfile(customer.id(), request));
    }
}
