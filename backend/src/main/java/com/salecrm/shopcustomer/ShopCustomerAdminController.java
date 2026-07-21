package com.salecrm.shopcustomer;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.common.web.PageResponse;
import com.salecrm.shopcustomer.dto.ShopCustomerAdminUpdateRequest;
import com.salecrm.shopcustomer.dto.ShopCustomerResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/shop-customers")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('SHOP_USERS_MANAGE')")
public class ShopCustomerAdminController {

    private final ShopCustomerAdminService adminService;

    @GetMapping
    public ApiResponse<PageResponse<ShopCustomerResponse>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ShopCustomerTier tier,
            @RequestParam(required = false) Boolean trusted,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminService.search(q, tier, trusted, active, page, size));
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Long>> stats() {
        return ApiResponse.ok(adminService.stats());
    }

    @GetMapping("/{id}")
    public ApiResponse<ShopCustomerResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(adminService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<ShopCustomerResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ShopCustomerAdminUpdateRequest request) {
        return ApiResponse.ok(adminService.update(id, request), "Shop user updated");
    }
}
