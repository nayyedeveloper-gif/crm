package com.salecrm.product.controller;

import com.salecrm.common.web.ApiResponse;
import com.salecrm.product.ProductImageSlot;
import com.salecrm.product.dto.PublicProductResponse;
import com.salecrm.product.dto.PublicProductSummary;
import com.salecrm.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Unauthenticated catalog + product views for the Gems & Jewellery storefront / QR pages.
 */
@RestController
@RequestMapping("/public/products")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class PublicProductController {

    private final ProductService productService;

    @GetMapping
    public ApiResponse<List<PublicProductSummary>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q) {
        return ApiResponse.ok(productService.listPublic(category, q));
    }

    @GetMapping("/featured")
    public ApiResponse<List<PublicProductSummary>> featured() {
        return ApiResponse.ok(productService.listFeatured());
    }

    @GetMapping("/special")
    public ApiResponse<List<PublicProductSummary>> special() {
        return ApiResponse.ok(productService.listSpecialOffers());
    }

    @GetMapping("/{publicCode}")
    public ApiResponse<PublicProductResponse> get(@PathVariable String publicCode) {
        return ApiResponse.ok(productService.getPublic(publicCode));
    }

    @GetMapping("/{publicCode}/related")
    public ApiResponse<List<PublicProductSummary>> related(@PathVariable String publicCode) {
        return ApiResponse.ok(productService.listRelated(publicCode));
    }

    @GetMapping("/{publicCode}/images/{slot}")
    public ResponseEntity<Resource> image(
            @PathVariable String publicCode,
            @PathVariable String slot) throws java.io.IOException {
        ProductImageSlot imageSlot = ProductImageSlot.from(slot);
        Resource resource = productService.loadPublicImage(publicCode, imageSlot);
        String filename = resource.getFilename() != null ? resource.getFilename() : "image.jpg";
        long lastModified = resource.lastModified();
        return ResponseEntity.ok()
                // Short cache + must-revalidate so replaced photos show up after save
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300, must-revalidate")
                .lastModified(lastModified > 0 ? lastModified : System.currentTimeMillis())
                .contentType(ProductService.mediaTypeFor(filename))
                .body(resource);
    }
}
