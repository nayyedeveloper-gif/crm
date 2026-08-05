package com.salecrm.showcase.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ForbiddenBranchAccessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.product.entity.ProductCategory;
import com.salecrm.product.repository.ProductCategoryRepository;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import com.salecrm.showcase.dto.ShowcaseBranchSummary;
import com.salecrm.showcase.dto.ShowcaseImageResponse;
import com.salecrm.showcase.dto.ShowcaseImageRow;
import com.salecrm.showcase.dto.ShowcaseItemResponse;
import com.salecrm.showcase.dto.ShowcaseSummaryResponse;
import com.salecrm.showcase.entity.ShowcaseImage;
import com.salecrm.showcase.entity.ShowcaseItem;
import com.salecrm.showcase.entity.ShowcaseSubcategory;
import com.salecrm.showcase.repository.ShowcaseImageRepository;
import com.salecrm.showcase.repository.ShowcaseItemRepository;
import com.salecrm.showcase.util.JewelleryCategories;
import com.salecrm.webhook.service.N8nWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ShowcaseService {

    public static final int MAX_IMAGES = 12;

    private final ShowcaseItemRepository itemRepository;
    private final ShowcaseImageRepository imageRepository;
    private final BranchRepository branchRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ShowcaseImageStorage imageStorage;
    private final AuditLogService auditLogService;
    private final ShowcaseSubcategoryService subcategoryService;
    private final N8nWebhookService n8nWebhookService;

    @Transactional(readOnly = true)
    public ShowcaseSummaryResponse summary() {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        List<Object[]> rows = itemRepository.countActiveByBranch();
        List<ShowcaseBranchSummary> branches = new ArrayList<>();
        long total = 0;
        for (Object[] row : rows) {
            Long branchId = (Long) row[0];
            if (!canAccessBranch(user, branchId)) continue;
            long count = (Long) row[3];
            total += count;
            branches.add(new ShowcaseBranchSummary(
                    branchId,
                    (String) row[1],
                    (String) row[2],
                    count
            ));
        }
        // Ensure user's own branch appears even with 0 items
        if (!user.isCrossBranch() && user.getBranchId() != null
                && branches.stream().noneMatch(b -> b.branchId().equals(user.getBranchId()))) {
            branchRepository.findById(user.getBranchId()).ifPresent(b ->
                    branches.add(0, new ShowcaseBranchSummary(b.getId(), b.getCode(), b.getName(), 0)));
        }
        if (user.isCrossBranch()) {
            for (Branch b : branchRepository.findAllByActiveTrueOrderByCodeAsc()) {
                if (branches.stream().noneMatch(x -> x.branchId().equals(b.getId()))) {
                    branches.add(new ShowcaseBranchSummary(b.getId(), b.getCode(), b.getName(), 0));
                }
            }
            branches.sort((a, b) -> a.branchCode().compareToIgnoreCase(b.branchCode()));
            total = branches.stream().mapToLong(ShowcaseBranchSummary::itemCount).sum();
        }
        return new ShowcaseSummaryResponse(total, branches);
    }

    @Transactional(readOnly = true)
    public List<ShowcaseItemResponse> list(Long branchId, String q) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        Long effective = resolveBranchId(user, branchId);
        String query = StringUtils.hasText(q) ? q.trim() : null;
        List<ShowcaseItem> items = query == null
                ? itemRepository.findAllForBranch(effective)
                : itemRepository.searchForBranch(effective, query);
        items = items.stream()
                .sorted((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()))
                .toList();
        if (items.isEmpty()) {
            return List.of();
        }
        List<Long> ids = items.stream().map(ShowcaseItem::getId).toList();
        Map<Long, ShowcaseImageRow> coverByItem = new HashMap<>();
        Map<Long, Integer> countByItem = new HashMap<>();
        for (ShowcaseImageRow row : imageRepository.findRowsByItemIdIn(ids)) {
            countByItem.merge(row.itemId(), 1, Integer::sum);
            coverByItem.putIfAbsent(row.itemId(), row);
        }
        return items.stream()
                .map(item -> toListResponse(
                        item,
                        coverByItem.get(item.getId()),
                        countByItem.getOrDefault(item.getId(), 0)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ShowcaseItemResponse get(Long id) {
        ShowcaseItem item = require(id);
        ensureBranchAccess(item.getBranch().getId());
        return toResponse(item);
    }

    @Transactional
    public ShowcaseItemResponse create(
            Long branchId,
            String itemCode,
            String name,
            Long categoryId,
            Long subcategoryId,
            String description,
            BigDecimal priceMmk,
            String metalPurity,
            BigDecimal weightGram,
            BigDecimal stoneCarat,
            MultipartFile[] images,
            String photoSequence) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        Branch branch = requireWritableBranch(user, branchId);
        ProductCategory category = requireCategory(categoryId);
        String code = requireCode(itemCode, branch.getId(), null);
        if (!StringUtils.hasText(name)) {
            throw new BusinessException("Name is required");
        }
        if (!StringUtils.hasText(description)) {
            throw new BusinessException("Description is required");
        }

        ShowcaseItem item = ShowcaseItem.builder()
                .branch(branch)
                .itemCode(code)
                .name(name.trim())
                .category(category.getName())
                .categoryEntity(category)
                .description(description.trim())
                .priceMmk(normalizePrice(priceMmk))
                .metalPurity(blankToNull(metalPurity))
                .weightGram(normalizePositive(weightGram, "Weight"))
                .stoneCarat(normalizePositive(stoneCarat, "Stone carat"))
                .active(true)
                .build();
        applySubcategory(item, category, subcategoryId);
        item = itemRepository.save(item);
        applyPhotoSequence(item, photoSequence, images);
        ShowcaseItem saved = itemRepository.save(item);

        auditLogService.change("SHOWCASE", "CREATE",
                "Showcase item: " + saved.getItemCode() + " @ " + branch.getCode(),
                "id=" + saved.getId());
        ShowcaseItemResponse response = toResponse(saved);
        n8nWebhookService.dispatch("showcase.created", response);
        return response;
    }

    @Transactional
    public ShowcaseItemResponse update(
            Long id,
            Long branchId,
            String itemCode,
            String name,
            Long categoryId,
            Long subcategoryId,
            String description,
            BigDecimal priceMmk,
            String metalPurity,
            BigDecimal weightGram,
            BigDecimal stoneCarat,
            Boolean active,
            MultipartFile[] images,
            String removeImageIds,
            String photoSequence) {
        ShowcaseItem item = require(id);
        ensureBranchAccess(item.getBranch().getId());
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        ProductCategory category = requireCategory(categoryId);

        if (user.isCrossBranch() && branchId != null && !branchId.equals(item.getBranch().getId())) {
            Branch next = requireWritableBranch(user, branchId);
            item.setBranch(next);
        }
        item.setItemCode(requireCode(itemCode, item.getBranch().getId(), id));
        if (!StringUtils.hasText(name)) {
            throw new BusinessException("Name is required");
        }
        item.setName(name.trim());
        item.setCategory(category.getName());
        item.setCategoryEntity(category);
        if (!StringUtils.hasText(description)) {
            throw new BusinessException("Description is required");
        }
        item.setDescription(description.trim());
        applySubcategory(item, category, subcategoryId);
        item.setPriceMmk(normalizePrice(priceMmk));
        item.setMetalPurity(blankToNull(metalPurity));
        item.setWeightGram(normalizePositive(weightGram, "Weight"));
        item.setStoneCarat(normalizePositive(stoneCarat, "Stone carat"));
        if (active != null) {
            item.setActive(active);
        }

        removeImages(item, removeImageIds);
        applyPhotoSequence(item, photoSequence, images);
        ShowcaseItem saved = itemRepository.save(item);

        auditLogService.change("SHOWCASE", "UPDATE",
                "Showcase item updated: " + saved.getItemCode(),
                "id=" + saved.getId());
        ShowcaseItemResponse response = toResponse(saved);
        n8nWebhookService.dispatch("showcase.updated", response);
        return response;
    }

    @Transactional
    public void delete(Long id) {
        ShowcaseItem item = require(id);
        ensureBranchAccess(item.getBranch().getId());
        for (ShowcaseImage img : item.getImages()) {
            imageStorage.deleteQuietly(img.getFilePath());
        }
        String code = item.getItemCode();
        itemRepository.delete(item);
        auditLogService.change("SHOWCASE", "DELETE",
                "Showcase item deleted: " + code,
                "id=" + id);
        n8nWebhookService.dispatch("showcase.deleted", Map.of("id", id, "itemCode", code));
    }

    @Transactional(readOnly = true)
    public Resource loadImage(Long itemId, Long imageId) {
        return loadImage(itemId, imageId, false);
    }

    @Transactional(readOnly = true)
    public Resource loadImage(Long itemId, Long imageId, boolean thumb) {
        ShowcaseImage image = imageRepository.findForItem(itemId, imageId)
                .orElseThrow(() -> new ResourceNotFoundException("ShowcaseImage", imageId));
        ensureBranchAccess(image.getItem().getBranch().getId());
        Path path = imageStorage.resolve(image.getFilePath(), thumb);
        return new FileSystemResource(path);
    }

    public static MediaType mediaTypeFor(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".webp")) return new MediaType("image", "webp");
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        return MediaType.IMAGE_JPEG;
    }

    /**
     * Applies photo order. {@code photoSequence} is a comma-separated list of existing image ids
     * and the token {@code new} for each new multipart file (in order). When omitted, new images
     * are appended after existing ones.
     */
    private void applyPhotoSequence(ShowcaseItem item, String photoSequence, MultipartFile[] images) {
        if (!StringUtils.hasText(photoSequence)) {
            addImages(item, images);
            return;
        }

        Map<Long, ShowcaseImage> byId = new HashMap<>();
        for (ShowcaseImage img : item.getImages()) {
            byId.put(img.getId(), img);
        }

        List<ShowcaseImage> ordered = new ArrayList<>();
        int fileIdx = 0;
        MultipartFile[] files = images != null ? images : new MultipartFile[0];

        for (String raw : photoSequence.split(",")) {
            String token = raw.trim();
            if (!StringUtils.hasText(token)) continue;
            if ("new".equalsIgnoreCase(token)) {
                while (fileIdx < files.length && (files[fileIdx] == null || files[fileIdx].isEmpty())) {
                    fileIdx++;
                }
                if (fileIdx >= files.length) {
                    throw new BusinessException("Photo sequence is missing a new image file");
                }
                if (ordered.size() >= MAX_IMAGES) {
                    throw new BusinessException("Maximum " + MAX_IMAGES + " photos per item");
                }
                String path = imageStorage.store(item.getId(), files[fileIdx++]);
                if (path == null) {
                    throw new BusinessException("Failed to store showcase image");
                }
                ShowcaseImage created = ShowcaseImage.builder()
                        .filePath(path)
                        .sortOrder(ordered.size())
                        .build();
                ordered.add(created);
            } else {
                Long id;
                try {
                    id = Long.valueOf(token);
                } catch (NumberFormatException e) {
                    throw new BusinessException("Invalid photo sequence token: " + token);
                }
                ShowcaseImage existing = byId.remove(id);
                if (existing == null) {
                    throw new BusinessException("Unknown photo in sequence: " + id);
                }
                ordered.add(existing);
            }
        }

        if (ordered.size() > MAX_IMAGES) {
            throw new BusinessException("Maximum " + MAX_IMAGES + " photos per item");
        }

        for (ShowcaseImage leftover : byId.values()) {
            imageStorage.deleteQuietly(leftover.getFilePath());
            item.getImages().remove(leftover);
            leftover.setItem(null);
        }

        for (int i = 0; i < ordered.size(); i++) {
            ShowcaseImage img = ordered.get(i);
            img.setSortOrder(i);
            if (img.getId() == null) {
                item.addImage(img);
            }
        }
    }

    private void addImages(ShowcaseItem item, MultipartFile[] images) {
        if (images == null || images.length == 0) return;
        int existing = item.getImages().size();
        int nextOrder = item.getImages().stream()
                .mapToInt(ShowcaseImage::getSortOrder)
                .max()
                .orElse(-1) + 1;
        int added = 0;
        for (MultipartFile file : images) {
            if (file == null || file.isEmpty()) continue;
            if (existing + added >= MAX_IMAGES) {
                throw new BusinessException("Maximum " + MAX_IMAGES + " photos per item");
            }
            String path = imageStorage.store(item.getId(), file);
            if (path == null) continue;
            ShowcaseImage img = ShowcaseImage.builder()
                    .filePath(path)
                    .sortOrder(nextOrder++)
                    .build();
            item.addImage(img);
            added++;
        }
    }

    private void removeImages(ShowcaseItem item, String removeImageIds) {
        if (!StringUtils.hasText(removeImageIds)) return;
        Set<Long> ids = Arrays.stream(removeImageIds.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(Long::valueOf)
                .collect(Collectors.toCollection(HashSet::new));
        List<ShowcaseImage> toRemove = item.getImages().stream()
                .filter(img -> ids.contains(img.getId()))
                .toList();
        for (ShowcaseImage img : toRemove) {
            imageStorage.deleteQuietly(img.getFilePath());
            item.getImages().remove(img);
            img.setItem(null);
        }
    }

    private ShowcaseItem require(Long id) {
        return itemRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShowcaseItem", id));
    }

    private Branch requireWritableBranch(UserPrincipal user, Long branchId) {
        Long effective = resolveBranchId(user, branchId);
        if (effective == null) {
            throw new BusinessException("Branch is required");
        }
        return branchRepository.findById(effective)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", effective));
    }

    private Long resolveBranchId(UserPrincipal user, Long requested) {
        if (user.isCrossBranch()) {
            return requested;
        }
        Long own = user.getBranchId();
        if (own == null) {
            throw new ForbiddenBranchAccessException();
        }
        if (requested != null && !requested.equals(own)) {
            throw new ForbiddenBranchAccessException();
        }
        return own;
    }

    private void ensureBranchAccess(Long branchId) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        if (!canAccessBranch(user, branchId)) {
            throw new ForbiddenBranchAccessException();
        }
    }

    private static boolean canAccessBranch(UserPrincipal user, Long branchId) {
        if (user.isCrossBranch()) return true;
        return user.getBranchId() != null && user.getBranchId().equals(branchId);
    }

    private String requireCode(String raw, Long branchId, Long excludeId) {
        if (!StringUtils.hasText(raw)) {
            throw new BusinessException("Code is required");
        }
        String code = raw.trim().toUpperCase();
        boolean exists = excludeId == null
                ? itemRepository.existsByBranchIdAndItemCodeIgnoreCase(branchId, code)
                : itemRepository.existsByBranchIdAndItemCodeIgnoreCaseAndIdNot(branchId, code, excludeId);
        if (exists) {
            throw new BusinessException("Code already exists in this branch: " + code);
        }
        return code;
    }

    private ProductCategory requireCategory(Long categoryId) {
        if (categoryId == null) {
            throw new BusinessException("Category is required");
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCategory", categoryId));
    }

    private void applySubcategory(ShowcaseItem item, ProductCategory category, Long subcategoryId) {
        if (!JewelleryCategories.requiresSubcategory(category.getName())) {
            item.setSubcategoryEntity(null);
            item.setSubCategory(null);
            return;
        }
        if (subcategoryId == null) {
            item.setSubcategoryEntity(null);
            item.setSubCategory(null);
            return;
        }
        ShowcaseSubcategory sub = subcategoryService.requireForCategory(subcategoryId, category);
        item.setSubcategoryEntity(sub);
        item.setSubCategory(sub.getName());
    }

    private ShowcaseItemResponse toResponse(ShowcaseItem item) {
        List<ShowcaseImage> all = item.getImages();
        List<ShowcaseImageResponse> imageResponses = all.stream()
                .map(img -> new ShowcaseImageResponse(
                        img.getId(),
                        "/showcase/" + item.getId() + "/images/" + img.getId(),
                        "/showcase/" + item.getId() + "/images/" + img.getId() + "?size=thumb",
                        img.getSortOrder()))
                .toList();
        return buildResponse(item, imageResponses, all.size());
    }

    private ShowcaseItemResponse toListResponse(ShowcaseItem item, ShowcaseImageRow cover, int imageCount) {
        List<ShowcaseImageResponse> images = cover == null
                ? List.of()
                : List.of(new ShowcaseImageResponse(
                        cover.imageId(),
                        "/showcase/" + item.getId() + "/images/" + cover.imageId(),
                        "/showcase/" + item.getId() + "/images/" + cover.imageId() + "?size=thumb",
                        cover.sortOrder()));
        return buildResponse(item, images, imageCount);
    }

    private ShowcaseItemResponse buildResponse(
            ShowcaseItem item, List<ShowcaseImageResponse> imageResponses, int imageCount) {
        Branch b = item.getBranch();
        Long categoryId = item.getCategoryEntity() != null ? item.getCategoryEntity().getId() : null;
        String categoryName = item.getCategoryEntity() != null
                ? item.getCategoryEntity().getName()
                : item.getCategory();
        Long subcategoryId = item.getSubcategoryEntity() != null ? item.getSubcategoryEntity().getId() : null;
        String subCategoryName = item.getSubcategoryEntity() != null
                ? item.getSubcategoryEntity().getName()
                : item.getSubCategory();
        return new ShowcaseItemResponse(
                item.getId(),
                b.getId(),
                b.getCode(),
                b.getName(),
                item.getItemCode(),
                item.getName(),
                categoryId,
                categoryName,
                subcategoryId,
                subCategoryName,
                item.getDescription(),
                item.getPriceMmk(),
                item.getMetalPurity(),
                item.getWeightGram(),
                item.getStoneCarat(),
                item.isActive(),
                imageCount,
                imageResponses,
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
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

    private static BigDecimal normalizePositive(BigDecimal value, String label) {
        if (value == null) return null;
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(label + " cannot be negative");
        }
        return value;
    }
}
