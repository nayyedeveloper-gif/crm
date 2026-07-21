package com.salecrm.inquiry.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.inquiry.dto.ShopInquiryRequest;
import com.salecrm.inquiry.dto.ShopInquiryResponse;
import com.salecrm.inquiry.service.ShopInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/inquiries")
@RequiredArgsConstructor
public class PublicShopInquiryController {

    private final ShopInquiryService shopInquiryService;

    @PostMapping
    public ApiResponse<ShopInquiryResponse> submit(@Valid @RequestBody ShopInquiryRequest request) {
        return ApiResponse.ok(shopInquiryService.submit(request), "Inquiry submitted");
    }
}
