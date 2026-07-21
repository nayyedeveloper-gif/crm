package com.salecrm.order.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.order.dto.ShopOrderCreateRequest;
import com.salecrm.order.dto.ShopOrderResponse;
import com.salecrm.order.service.ShopOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/orders")
@RequiredArgsConstructor
public class PublicShopOrderController {

    private final ShopOrderService shopOrderService;

    @PostMapping
    public ApiResponse<ShopOrderResponse> create(@Valid @RequestBody ShopOrderCreateRequest request) {
        return ApiResponse.ok(shopOrderService.create(request), "Order placed");
    }

    @GetMapping("/track")
    public ApiResponse<ShopOrderResponse> track(
            @RequestParam String code,
            @RequestParam String phone) {
        return ApiResponse.ok(shopOrderService.track(code, phone));
    }
}
