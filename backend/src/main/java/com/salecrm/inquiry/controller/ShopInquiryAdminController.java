package com.salecrm.inquiry.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.inquiry.dto.ShopInquiryResponse;
import com.salecrm.inquiry.dto.ShopInquiryStatusRequest;
import com.salecrm.inquiry.service.ShopInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inquiries")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('INQUIRIES_MANAGE')")
public class ShopInquiryAdminController {

    private final ShopInquiryService shopInquiryService;

    @GetMapping
    public ApiResponse<List<ShopInquiryResponse>> list() {
        return ApiResponse.ok(shopInquiryService.listAll());
    }

    @GetMapping("/count")
    public ApiResponse<Long> count(@RequestParam(defaultValue = "NEW") String status) {
        return ApiResponse.ok(shopInquiryService.countByStatus(status));
    }

    @PutMapping("/{id}/status")
    public ApiResponse<ShopInquiryResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ShopInquiryStatusRequest request) {
        return ApiResponse.ok(shopInquiryService.updateStatus(id, request.status()), "Status updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        shopInquiryService.delete(id);
        return ApiResponse.ok(null, "Inquiry deleted");
    }
}
