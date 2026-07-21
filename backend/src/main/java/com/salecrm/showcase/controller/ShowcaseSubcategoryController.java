package com.salecrm.showcase.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.showcase.dto.ShowcaseSubcategoryRequest;
import com.salecrm.showcase.dto.ShowcaseSubcategoryResponse;
import com.salecrm.showcase.service.ShowcaseSubcategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/showcase/subcategories")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('SHOWCASE_MANAGE')")
public class ShowcaseSubcategoryController {

    private final ShowcaseSubcategoryService subcategoryService;

    @GetMapping
    public ApiResponse<List<ShowcaseSubcategoryResponse>> list(
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ApiResponse.ok(subcategoryService.list(categoryId, activeOnly));
    }

    @PostMapping
    public ApiResponse<ShowcaseSubcategoryResponse> create(@Valid @RequestBody ShowcaseSubcategoryRequest request) {
        return ApiResponse.ok(subcategoryService.create(request), "Sub category created");
    }

    @PutMapping("/{id}")
    public ApiResponse<ShowcaseSubcategoryResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ShowcaseSubcategoryRequest request) {
        return ApiResponse.ok(subcategoryService.update(id, request), "Sub category updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        subcategoryService.delete(id);
        return ApiResponse.ok(null, "Sub category deleted");
    }
}
