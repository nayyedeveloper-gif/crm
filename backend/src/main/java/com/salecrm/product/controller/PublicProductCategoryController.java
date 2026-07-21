package com.salecrm.product.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.product.dto.ProductCategoryResponse;
import com.salecrm.product.service.ProductCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/public/product-categories")
@RequiredArgsConstructor
public class PublicProductCategoryController {

    private final ProductCategoryService productCategoryService;

    @GetMapping
    public ApiResponse<List<ProductCategoryResponse>> listActive() {
        return ApiResponse.ok(productCategoryService.listActive());
    }
}
