package com.salecrm.product.service;

import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.product.ProductImageSlot;
import com.salecrm.product.dto.ProductResponse;
import com.salecrm.product.dto.PublicProductResponse;
import com.salecrm.product.dto.PublicProductSummary;
import com.salecrm.product.entity.Product;
import com.salecrm.product.entity.ProductCategory;
import com.salecrm.product.repository.ProductCategoryRepository;
import com.salecrm.product.repository.ProductRepository;
import com.salecrm.settings.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductImageStorage imageStorage;
    private final AuditLogService auditLogService;
    private final AppSettingsRepository appSettingsRepository;

    @Value("${app.public.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Transactional(readOnly = true)
    public List<ProductResponse> listAll() {
        return productRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getById(Long id) {
        return toAdminResponse(require(id));
    }

    @Transactional
    public ProductResponse create(
            String productCode,
            String name,
            Long categoryId,
            String description,
            BigDecimal price,
            BigDecimal compareAtPrice,
            Boolean featured,
            Boolean specialOffer,
            java.time.Instant offerEndsAt,
            String offerHeadline,
            String metalPurity,
            BigDecimal weightGram,
            BigDecimal stoneCarat,
            MultipartFile front,
            MultipartFile back,
            MultipartFile side,
            MultipartFile other,
            MultipartFile offer) {
        String normalizedCode = requireProductCode(productCode, null);
        ProductCategory category = requireCategory(categoryId);
        if (!StringUtils.hasText(name)) {
            throw new BusinessException("Product name is required");
        }

        Product product = Product.builder()
                .productCode(normalizedCode)
                .name(name.trim())
                .category(category.getName())
                .categoryEntity(category)
                .description(blankToNull(description))
                .price(normalizePrice(price))
                .compareAtPrice(normalizeCompareAt(normalizePrice(price), normalizePrice(compareAtPrice)))
                .featured(Boolean.TRUE.equals(featured))
                .specialOffer(Boolean.TRUE.equals(specialOffer))
                .offerEndsAt(Boolean.TRUE.equals(specialOffer) ? offerEndsAt : null)
                .offerHeadline(Boolean.TRUE.equals(specialOffer) ? blankToNull(offerHeadline) : null)
                .metalPurity(blankToNull(metalPurity))
                .weightGram(normalizePositive(weightGram, "Weight"))
                .stoneCarat(normalizePositive(stoneCarat, "Stone carat"))
                .publicCode(generatePublicCode())
                .active(true)
                .build();
        product = productRepository.save(product);

        applyImages(product, front, back, side, other, offer, false, false);
        Product saved = productRepository.save(product);

        auditLogService.change("PRODUCTS", "CREATE",
                "Product created: " + saved.getProductCode() + " / " + saved.getName(),
                "code=" + saved.getPublicCode());
        return toAdminResponse(saved);
    }

    @Transactional
    public ProductResponse update(
            Long id,
            String productCode,
            String name,
            Long categoryId,
            String description,
            BigDecimal price,
            BigDecimal compareAtPrice,
            Boolean featured,
            Boolean specialOffer,
            java.time.Instant offerEndsAt,
            String offerHeadline,
            String metalPurity,
            BigDecimal weightGram,
            BigDecimal stoneCarat,
            Boolean active,
            MultipartFile front,
            MultipartFile back,
            MultipartFile side,
            MultipartFile other,
            MultipartFile offer,
            boolean clearOfferImage) {
        Product product = require(id);
        String normalizedCode = requireProductCode(productCode, id);
        ProductCategory category = requireCategory(categoryId);
        if (!StringUtils.hasText(name)) {
            throw new BusinessException("Product name is required");
        }

        product.setProductCode(normalizedCode);
        product.setName(name.trim());
        product.setCategory(category.getName());
        product.setCategoryEntity(category);
        product.setDescription(blankToNull(description));
        BigDecimal salePrice = normalizePrice(price);
        product.setPrice(salePrice);
        product.setCompareAtPrice(normalizeCompareAt(salePrice, normalizePrice(compareAtPrice)));
        if (featured != null) {
            product.setFeatured(featured);
        }
        if (specialOffer != null) {
            product.setSpecialOffer(specialOffer);
        }
        if (product.isSpecialOffer()) {
            product.setOfferEndsAt(offerEndsAt);
            product.setOfferHeadline(blankToNull(offerHeadline));
        } else {
            product.setOfferEndsAt(null);
            product.setOfferHeadline(null);
        }
        product.setMetalPurity(blankToNull(metalPurity));
        product.setWeightGram(normalizePositive(weightGram, "Weight"));
        product.setStoneCarat(normalizePositive(stoneCarat, "Stone carat"));
        if (active != null) {
            product.setActive(active);
        }
        applyImages(product, front, back, side, other, offer, clearOfferImage, true);
        Product saved = productRepository.save(product);

        auditLogService.change("PRODUCTS", "UPDATE",
                "Product updated: " + saved.getProductCode() + " / " + saved.getName(),
                "code=" + saved.getPublicCode());
        return toAdminResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Product product = require(id);
        imageStorage.deleteQuietly(product.getImageFront());
        imageStorage.deleteQuietly(product.getImageBack());
        imageStorage.deleteQuietly(product.getImageSide());
        imageStorage.deleteQuietly(product.getImageOther());
        imageStorage.deleteQuietly(product.getImageOffer());
        productRepository.delete(product);
        auditLogService.change("PRODUCTS", "DELETE",
                "Product deleted: " + product.getProductCode() + " / " + product.getName(),
                "code=" + product.getPublicCode());
    }

    @Transactional(readOnly = true)
    public PublicProductResponse getPublic(String publicCode) {
        Product product = productRepository.findByPublicCodeAndActiveTrue(publicCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Product", publicCode));
        return toPublicDetail(product);
    }

    @Transactional(readOnly = true)
    public List<PublicProductSummary> listPublic(String category, String q) {
        String cat = StringUtils.hasText(category) ? category.trim() : null;
        String query = StringUtils.hasText(q) ? q.trim() : null;
        List<Product> products;
        if (cat == null && query == null) {
            products = productRepository.findAllByActiveTrueOrderByUpdatedAtDesc();
        } else if (query == null) {
            products = productRepository.findAllByActiveTrueAndCategoryIgnoreCaseOrderByUpdatedAtDesc(cat);
        } else if (cat == null) {
            products = productRepository.searchPublicByQuery(query);
        } else {
            products = productRepository.searchPublicByCategoryAndQuery(cat, query);
        }
        return products.stream().map(this::toPublicSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductSummary> listFeatured() {
        return productRepository.findAllByActiveTrueAndFeaturedTrueOrderByUpdatedAtDesc().stream()
                .map(this::toPublicSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductSummary> listSpecialOffers() {
        return productRepository.findActiveSpecialOffers(java.time.Instant.now()).stream()
                .map(this::toPublicSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductSummary> listRelated(String publicCode) {
        Product product = productRepository.findByPublicCodeAndActiveTrue(publicCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Product", publicCode));
        return productRepository
                .findTop8ByActiveTrueAndCategoryIgnoreCaseAndPublicCodeNotOrderByUpdatedAtDesc(
                        product.getCategory(), product.getPublicCode())
                .stream()
                .map(this::toPublicSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource loadPublicImage(String publicCode, ProductImageSlot slot) {
        return loadPublicImage(publicCode, slot, false);
    }

    @Transactional(readOnly = true)
    public Resource loadPublicImage(String publicCode, ProductImageSlot slot, boolean thumb) {
        Product product = productRepository.findByPublicCode(publicCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Product", publicCode));
        String relative = pathForSlot(product, slot);
        if (!StringUtils.hasText(relative)) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND);
        }
        Path path = imageStorage.resolve(relative, thumb);
        return new FileSystemResource(path);
    }

    @Transactional(readOnly = true)
    public Resource loadAdminImage(Long id, ProductImageSlot slot) {
        Product product = require(id);
        String relative = pathForSlot(product, slot);
        if (!StringUtils.hasText(relative)) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND);
        }
        return new FileSystemResource(imageStorage.resolve(relative));
    }

    public static MediaType mediaTypeFor(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase();
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return new MediaType("image", "webp");
        }
        if (lower.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        }
        return MediaType.IMAGE_JPEG;
    }

    private void applyImages(
            Product product,
            MultipartFile front,
            MultipartFile back,
            MultipartFile side,
            MultipartFile other,
            MultipartFile offer,
            boolean clearOfferImage,
            boolean replaceExisting) {
        Long id = product.getId();
        if (hasFile(front)) {
            if (replaceExisting) imageStorage.deleteQuietly(product.getImageFront());
            product.setImageFront(imageStorage.store(id, ProductImageSlot.FRONT, front));
        }
        if (hasFile(back)) {
            if (replaceExisting) imageStorage.deleteQuietly(product.getImageBack());
            product.setImageBack(imageStorage.store(id, ProductImageSlot.BACK, back));
        }
        if (hasFile(side)) {
            if (replaceExisting) imageStorage.deleteQuietly(product.getImageSide());
            product.setImageSide(imageStorage.store(id, ProductImageSlot.SIDE, side));
        }
        if (hasFile(other)) {
            if (replaceExisting) imageStorage.deleteQuietly(product.getImageOther());
            product.setImageOther(imageStorage.store(id, ProductImageSlot.OTHER, other));
        }
        if (hasFile(offer)) {
            if (replaceExisting) imageStorage.deleteQuietly(product.getImageOffer());
            product.setImageOffer(imageStorage.store(id, ProductImageSlot.OFFER, offer));
        } else if (clearOfferImage) {
            imageStorage.deleteQuietly(product.getImageOffer());
            product.setImageOffer(null);
        }
    }

    private Product require(Long id) {
        return productRepository.findWithCategoryById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private ProductCategory requireCategory(Long categoryId) {
        if (categoryId == null) {
            throw new BusinessException("Category is required");
        }
        ProductCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCategory", categoryId));
        return category;
    }

    private String requireProductCode(String productCode, Long excludeId) {
        if (!StringUtils.hasText(productCode)) {
            throw new BusinessException("Product Code is required");
        }
        String normalized = productCode.trim().toUpperCase();
        boolean exists = excludeId == null
                ? productRepository.existsByProductCodeIgnoreCase(normalized)
                : productRepository.existsByProductCodeIgnoreCaseAndIdNot(normalized, excludeId);
        if (exists) {
            throw new BusinessException("Product Code already exists: " + normalized);
        }
        return normalized;
    }

    private String generatePublicCode() {
        for (int i = 0; i < 8; i++) {
            String code = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            if (!productRepository.existsByPublicCode(code)) {
                return code;
            }
        }
        throw new BusinessException("Could not allocate public code", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private PublicProductResponse toPublicDetail(Product product) {
        var settings = appSettingsRepository.findById(1L).orElse(null);
        String appName = settings != null ? settings.getAppName() : "Sale CRM";
        String whatsapp = settings != null ? settings.getShopWhatsapp() : null;
        String viber = settings != null ? settings.getShopViber() : null;
        return new PublicProductResponse(
                product.getPublicCode(),
                product.getProductCode(),
                product.getName(),
                product.getCategory(),
                product.getDescription(),
                product.getPrice(),
                product.getCompareAtPrice(),
                product.isFeatured(),
                product.isSpecialOffer(),
                product.getOfferEndsAt(),
                product.getOfferHeadline(),
                product.getMetalPurity(),
                product.getWeightGram(),
                product.getStoneCarat(),
                publicImageUrls(product),
                appName,
                whatsapp,
                viber,
                product.getUpdatedAt()
        );
    }

    private PublicProductSummary toPublicSummary(Product product) {
        String code = product.getPublicCode();
        String imageUrl = StringUtils.hasText(product.getImageFront())
                ? "/public/products/" + code + "/images/front"
                : null;
        String offerImageUrl = StringUtils.hasText(product.getImageOffer())
                ? "/public/products/" + code + "/images/offer"
                : null;
        return new PublicProductSummary(
                product.getPublicCode(),
                product.getProductCode(),
                product.getName(),
                product.getCategory(),
                product.getPrice(),
                product.getCompareAtPrice(),
                product.isFeatured(),
                product.isSpecialOffer(),
                product.getOfferEndsAt(),
                product.getOfferHeadline(),
                product.getMetalPurity(),
                imageUrl,
                offerImageUrl,
                product.getUpdatedAt()
        );
    }

    private ProductResponse toAdminResponse(Product p) {
        String base = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
        Long categoryId = p.getCategoryEntity() != null ? p.getCategoryEntity().getId() : null;
        String categoryName = p.getCategoryEntity() != null ? p.getCategoryEntity().getName() : p.getCategory();
        return new ProductResponse(
                p.getId(),
                p.getProductCode(),
                p.getName(),
                categoryId,
                categoryName,
                p.getDescription(),
                p.getPrice(),
                p.getCompareAtPrice(),
                p.isFeatured(),
                p.isSpecialOffer(),
                p.getOfferEndsAt(),
                p.getOfferHeadline(),
                p.getMetalPurity(),
                p.getWeightGram(),
                p.getStoneCarat(),
                p.getPublicCode(),
                base + "/p/" + p.getPublicCode(),
                publicImageUrls(p),
                p.isActive(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    private Map<String, String> publicImageUrls(Product p) {
        String code = p.getPublicCode();
        Map<String, String> map = new LinkedHashMap<>();
        if (StringUtils.hasText(p.getImageFront())) {
            map.put("front", "/public/products/" + code + "/images/front");
        }
        if (StringUtils.hasText(p.getImageBack())) {
            map.put("back", "/public/products/" + code + "/images/back");
        }
        if (StringUtils.hasText(p.getImageSide())) {
            map.put("side", "/public/products/" + code + "/images/side");
        }
        if (StringUtils.hasText(p.getImageOther())) {
            map.put("other", "/public/products/" + code + "/images/other");
        }
        if (StringUtils.hasText(p.getImageOffer())) {
            map.put("offer", "/public/products/" + code + "/images/offer");
        }
        return map;
    }

    private static String pathForSlot(Product p, ProductImageSlot slot) {
        return switch (slot) {
            case FRONT -> p.getImageFront();
            case BACK -> p.getImageBack();
            case SIDE -> p.getImageSide();
            case OTHER -> p.getImageOther();
            case OFFER -> p.getImageOffer();
        };
    }

    private static boolean hasFile(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static BigDecimal normalizePrice(BigDecimal price) {
        if (price == null) return null;
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Price cannot be negative");
        }
        return price;
    }

    /** Keep compare-at only when it is strictly above the sale price. */
    private static BigDecimal normalizeCompareAt(BigDecimal salePrice, BigDecimal compareAt) {
        if (compareAt == null || salePrice == null) return null;
        if (compareAt.compareTo(salePrice) <= 0) return null;
        return compareAt;
    }

    private static BigDecimal normalizePositive(BigDecimal value, String label) {
        if (value == null) return null;
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(label + " cannot be negative");
        }
        return value;
    }
}
