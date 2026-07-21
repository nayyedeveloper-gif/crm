package com.salecrm.shopdashboard.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.shopdashboard.dto.ShopDashboardSummary;
import com.salecrm.shopdashboard.service.ShopDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/shop-dashboard")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('SHOP_DASHBOARD_VIEW')")
public class ShopDashboardController {

    private final ShopDashboardService shopDashboardService;

    @GetMapping("/summary")
    public ApiResponse<ShopDashboardSummary> summary() {
        return ApiResponse.ok(shopDashboardService.summary());
    }
}
