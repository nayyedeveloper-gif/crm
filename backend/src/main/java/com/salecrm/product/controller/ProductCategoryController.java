package com.salecrm.product.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.product.dto.ProductCategoryRequest;
import com.salecrm.product.dto.ProductCategoryResponse;
import com.salecrm.product.service.ProductCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/product-categories")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('PRODUCTS_MANAGE')")
public class ProductCategoryController {

    private final ProductCategoryService categoryService;

    @GetMapping
    public ApiResponse<List<ProductCategoryResponse>> list() {
        return ApiResponse.ok(categoryService.listAll());
    }

    @GetMapping("/active")
    public ApiResponse<List<ProductCategoryResponse>> listActive() {
        return ApiResponse.ok(categoryService.listActive());
    }

    @PostMapping
    public ApiResponse<ProductCategoryResponse> create(@Valid @RequestBody ProductCategoryRequest request) {
        return ApiResponse.ok(categoryService.create(request), "Category created");
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductCategoryResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductCategoryRequest request) {
        return ApiResponse.ok(categoryService.update(id, request), "Category updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ApiResponse.ok(null, "Category deleted");
    }
}
