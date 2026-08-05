package com.salecrm.showcase.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.showcase.dto.ShowcaseItemResponse;
import com.salecrm.showcase.dto.ShowcaseSummaryResponse;
import com.salecrm.showcase.service.ShowcaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/showcase")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('SHOWCASE_MANAGE')")
@SuppressWarnings("null")
public class ShowcaseController {

    private final ShowcaseService showcaseService;

    @GetMapping("/summary")
    public ApiResponse<ShowcaseSummaryResponse> summary() {
        return ApiResponse.ok(showcaseService.summary());
    }

    @GetMapping
    public ApiResponse<List<ShowcaseItemResponse>> list(
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam(value = "q", required = false) String q) {
        return ApiResponse.ok(showcaseService.list(branchId, q));
    }

    @GetMapping("/{id}")
    public ApiResponse<ShowcaseItemResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(showcaseService.get(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ShowcaseItemResponse> create(
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam("itemCode") String itemCode,
            @RequestParam("name") String name,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "subcategoryId", required = false) Long subcategoryId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "priceMmk", required = false) String priceMmk,
            @RequestParam(value = "metalPurity", required = false) String metalPurity,
            @RequestParam(value = "weightGram", required = false) String weightGram,
            @RequestParam(value = "stoneCarat", required = false) String stoneCarat,
            @RequestParam(value = "images", required = false) MultipartFile[] images,
            @RequestParam(value = "photoSequence", required = false) String photoSequence) {
        return ApiResponse.ok(
                showcaseService.create(
                        branchId, itemCode, name, categoryId, subcategoryId, description,
                        parseDecimal(priceMmk, "price"),
                        metalPurity,
                        parseDecimal(weightGram, "weight"),
                        parseDecimal(stoneCarat, "carat"),
                        images,
                        photoSequence),
                "Showcase item created");
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ShowcaseItemResponse> update(
            @PathVariable Long id,
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam("itemCode") String itemCode,
            @RequestParam("name") String name,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "subcategoryId", required = false) Long subcategoryId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "priceMmk", required = false) String priceMmk,
            @RequestParam(value = "metalPurity", required = false) String metalPurity,
            @RequestParam(value = "weightGram", required = false) String weightGram,
            @RequestParam(value = "stoneCarat", required = false) String stoneCarat,
            @RequestParam(value = "active", required = false) Boolean active,
            @RequestParam(value = "images", required = false) MultipartFile[] images,
            @RequestParam(value = "removeImageIds", required = false) String removeImageIds,
            @RequestParam(value = "photoSequence", required = false) String photoSequence) {
        return ApiResponse.ok(
                showcaseService.update(
                        id, branchId, itemCode, name, categoryId, subcategoryId, description,
                        parseDecimal(priceMmk, "price"),
                        metalPurity,
                        parseDecimal(weightGram, "weight"),
                        parseDecimal(stoneCarat, "carat"),
                        active, images, removeImageIds, photoSequence),
                "Showcase item updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        showcaseService.delete(id);
        return ApiResponse.ok(null, "Showcase item deleted");
    }

    @GetMapping("/{id}/images/{imageId}")
    public ResponseEntity<Resource> image(
            @PathVariable Long id,
            @PathVariable Long imageId,
            @RequestParam(value = "size", required = false) String size) {
        boolean thumb = size != null && size.equalsIgnoreCase("thumb");
        Resource resource = showcaseService.loadImage(id, imageId, thumb);
        String filename = resource.getFilename() != null ? resource.getFilename() : "image.jpg";
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
                .contentType(ShowcaseService.mediaTypeFor(filename))
                .body(resource);
    }

    private static BigDecimal parseDecimal(String raw, String field) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return new BigDecimal(raw.trim());
        } catch (NumberFormatException e) {
            throw new com.salecrm.common.exception.BusinessException("Invalid " + field);
        }
    }
}
