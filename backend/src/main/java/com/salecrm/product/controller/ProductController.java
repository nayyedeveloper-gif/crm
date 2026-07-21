package com.salecrm.product.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.product.ProductImageSlot;
import com.salecrm.product.dto.ProductResponse;
import com.salecrm.product.service.ProductService;
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
@RequestMapping("/products")
@RequiredArgsConstructor
@PreAuthorize("@perm.can('PRODUCTS_MANAGE')")
@SuppressWarnings("null")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ApiResponse<List<ProductResponse>> list() {
        return ApiResponse.ok(productService.listAll());
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(productService.getById(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ProductResponse> create(
            @RequestParam("productCode") String productCode,
            @RequestParam("name") String name,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "price", required = false) String price,
            @RequestParam(value = "compareAtPrice", required = false) String compareAtPrice,
            @RequestParam(value = "featured", required = false) Boolean featured,
            @RequestParam(value = "specialOffer", required = false) Boolean specialOffer,
            @RequestParam(value = "offerEndsAt", required = false) String offerEndsAt,
            @RequestParam(value = "offerHeadline", required = false) String offerHeadline,
            @RequestParam(value = "metalPurity", required = false) String metalPurity,
            @RequestParam(value = "weightGram", required = false) String weightGram,
            @RequestParam(value = "stoneCarat", required = false) String stoneCarat,
            @RequestParam(value = "imageFront", required = false) MultipartFile imageFront,
            @RequestParam(value = "imageBack", required = false) MultipartFile imageBack,
            @RequestParam(value = "imageSide", required = false) MultipartFile imageSide,
            @RequestParam(value = "imageOther", required = false) MultipartFile imageOther,
            @RequestParam(value = "imageOffer", required = false) MultipartFile imageOffer) {
        return ApiResponse.ok(
                productService.create(
                        productCode, name, categoryId, description, parseDecimal(price, "price"),
                        parseDecimal(compareAtPrice, "compare-at price"),
                        featured, specialOffer, parseInstant(offerEndsAt), offerHeadline,
                        metalPurity, parseDecimal(weightGram, "weight"),
                        parseDecimal(stoneCarat, "carat"),
                        imageFront, imageBack, imageSide, imageOther, imageOffer),
                "Product created");
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ProductResponse> update(
            @PathVariable Long id,
            @RequestParam("productCode") String productCode,
            @RequestParam("name") String name,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "price", required = false) String price,
            @RequestParam(value = "compareAtPrice", required = false) String compareAtPrice,
            @RequestParam(value = "featured", required = false) Boolean featured,
            @RequestParam(value = "specialOffer", required = false) Boolean specialOffer,
            @RequestParam(value = "offerEndsAt", required = false) String offerEndsAt,
            @RequestParam(value = "offerHeadline", required = false) String offerHeadline,
            @RequestParam(value = "metalPurity", required = false) String metalPurity,
            @RequestParam(value = "weightGram", required = false) String weightGram,
            @RequestParam(value = "stoneCarat", required = false) String stoneCarat,
            @RequestParam(value = "active", required = false) Boolean active,
            @RequestParam(value = "imageFront", required = false) MultipartFile imageFront,
            @RequestParam(value = "imageBack", required = false) MultipartFile imageBack,
            @RequestParam(value = "imageSide", required = false) MultipartFile imageSide,
            @RequestParam(value = "imageOther", required = false) MultipartFile imageOther,
            @RequestParam(value = "imageOffer", required = false) MultipartFile imageOffer,
            @RequestParam(value = "clearOfferImage", required = false) Boolean clearOfferImage) {
        return ApiResponse.ok(
                productService.update(
                        id, productCode, name, categoryId, description, parseDecimal(price, "price"),
                        parseDecimal(compareAtPrice, "compare-at price"),
                        featured, specialOffer, parseInstant(offerEndsAt), offerHeadline,
                        metalPurity, parseDecimal(weightGram, "weight"),
                        parseDecimal(stoneCarat, "carat"), active,
                        imageFront, imageBack, imageSide, imageOther, imageOffer,
                        Boolean.TRUE.equals(clearOfferImage)),
                "Product updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ApiResponse.ok(null, "Product deleted");
    }

    @GetMapping("/{id}/images/{slot}")
    public ResponseEntity<Resource> image(@PathVariable Long id, @PathVariable String slot) {
        ProductImageSlot imageSlot = ProductImageSlot.from(slot);
        Resource resource = productService.loadAdminImage(id, imageSlot);
        String filename = resource.getFilename() != null ? resource.getFilename() : "image.jpg";
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .contentType(ProductService.mediaTypeFor(filename))
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

    private static java.time.Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String value = raw.trim();
            if (value.length() == 16) {
                // datetime-local: 2026-07-25T18:00
                value = value + ":00";
            }
            if (!value.endsWith("Z") && !value.contains("+")) {
                return java.time.LocalDateTime.parse(value).atZone(java.time.ZoneId.of("Asia/Yangon")).toInstant();
            }
            return java.time.Instant.parse(value);
        } catch (Exception e) {
            throw new com.salecrm.common.exception.BusinessException("Invalid offer end time");
        }
    }
}
