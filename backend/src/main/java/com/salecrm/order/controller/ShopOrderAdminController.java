package com.salecrm.order.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.order.dto.ShopOrderResponse;
import com.salecrm.order.dto.ShopOrderStatusRequest;
import com.salecrm.order.service.ShopOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('ORDERS_MANAGE')")
public class ShopOrderAdminController {

    private final ShopOrderService shopOrderService;

    @GetMapping
    public ApiResponse<List<ShopOrderResponse>> list() {
        return ApiResponse.ok(shopOrderService.listAll());
    }

    @GetMapping("/count")
    public ApiResponse<Long> count(@RequestParam(defaultValue = "AWAITING_CONFIRMATION") String status) {
        return ApiResponse.ok(shopOrderService.countByStatus(status));
    }

    @GetMapping("/{id}")
    public ApiResponse<ShopOrderResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(shopOrderService.getById(id));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<ShopOrderResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ShopOrderStatusRequest request) {
        return ApiResponse.ok(
                shopOrderService.updateStatus(
                        id, request.status(), request.trackingNumber(), request.paymentStatus()),
                "Order updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        shopOrderService.delete(id);
        return ApiResponse.ok(null, "Order deleted");
    }
}
