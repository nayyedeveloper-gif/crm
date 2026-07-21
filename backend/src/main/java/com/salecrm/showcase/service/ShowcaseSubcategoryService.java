package com.salecrm.showcase.service;

import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.product.entity.ProductCategory;
import com.salecrm.product.repository.ProductCategoryRepository;
import com.salecrm.showcase.dto.ShowcaseSubcategoryRequest;
import com.salecrm.showcase.dto.ShowcaseSubcategoryResponse;
import com.salecrm.showcase.entity.ShowcaseSubcategory;
import com.salecrm.showcase.repository.ShowcaseItemRepository;
import com.salecrm.showcase.repository.ShowcaseSubcategoryRepository;
import com.salecrm.showcase.util.JewelleryCategories;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ShowcaseSubcategoryService {

    private final ShowcaseSubcategoryRepository subcategoryRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ShowcaseItemRepository itemRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<ShowcaseSubcategoryResponse> list(Long categoryId, boolean activeOnly) {
        List<ShowcaseSubcategory> rows = categoryId == null
                ? subcategoryRepository.findAllWithCategory()
                : (activeOnly
                        ? subcategoryRepository.findByCategoryIdAndActiveTrueOrderBySortOrderAscNameAsc(categoryId)
                        : subcategoryRepository.findByCategoryIdOrderBySortOrderAscNameAsc(categoryId));
        return rows.stream()
                .filter(sc -> JewelleryCategories.requiresSubcategory(sc.getCategory().getName()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ShowcaseSubcategoryResponse create(ShowcaseSubcategoryRequest request) {
        ProductCategory category = requireJewelleryCategory(request.categoryId());
        String name = request.name().trim();
        if (subcategoryRepository.existsByCategoryIdAndNameIgnoreCase(category.getId(), name)) {
            throw new BusinessException("Sub category already exists: " + name);
        }
        ShowcaseSubcategory sub = ShowcaseSubcategory.builder()
                .category(category)
                .name(name)
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : nextSortOrder(category.getId()))
                .active(request.active() == null || Boolean.TRUE.equals(request.active()))
                .build();
        ShowcaseSubcategory saved = subcategoryRepository.save(sub);
        auditLogService.change("SHOWCASE_SUBCATEGORIES", "CREATE",
                "Sub category created: " + category.getName() + " / " + saved.getName(), null);
        return toResponse(saved);
    }

    @Transactional
    public ShowcaseSubcategoryResponse update(Long id, ShowcaseSubcategoryRequest request) {
        ShowcaseSubcategory sub = require(id);
        ProductCategory category = requireJewelleryCategory(request.categoryId());
        String name = request.name().trim();
        if (subcategoryRepository.existsByCategoryIdAndNameIgnoreCaseAndIdNot(category.getId(), name, id)) {
            throw new BusinessException("Sub category already exists: " + name);
        }
        sub.setCategory(category);
        sub.setName(name);
        if (request.sortOrder() != null) {
            sub.setSortOrder(request.sortOrder());
        }
        sub.setActive(request.active() == null || Boolean.TRUE.equals(request.active()));
        ShowcaseSubcategory saved = subcategoryRepository.save(sub);
        itemRepository.syncSubCategoryName(saved.getId(), saved.getName());
        auditLogService.change("SHOWCASE_SUBCATEGORIES", "UPDATE",
                "Sub category updated: " + category.getName() + " / " + saved.getName(), null);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        ShowcaseSubcategory sub = require(id);
        long count = itemRepository.countBySubcategoryEntity_Id(id);
        if (count > 0) {
            throw new BusinessException(
                    "Cannot delete sub category in use by " + count + " Show Case item(s).");
        }
        subcategoryRepository.delete(sub);
        auditLogService.change("SHOWCASE_SUBCATEGORIES", "DELETE",
                "Sub category deleted: " + sub.getCategory().getName() + " / " + sub.getName(), null);
    }

    @Transactional(readOnly = true)
    public ShowcaseSubcategory requireForCategory(Long subcategoryId, ProductCategory category) {
        if (subcategoryId == null) {
            return null;
        }
        ShowcaseSubcategory sub = subcategoryRepository.findById(subcategoryId)
                .orElseThrow(() -> new ResourceNotFoundException("ShowcaseSubcategory", subcategoryId));
        if (!sub.getCategory().getId().equals(category.getId())) {
            throw new BusinessException("Sub category does not belong to selected category");
        }
        if (!sub.isActive()) {
            throw new BusinessException("Sub category is inactive: " + sub.getName());
        }
        return sub;
    }

    private ShowcaseSubcategory require(Long id) {
        return subcategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShowcaseSubcategory", id));
    }

    private ProductCategory requireJewelleryCategory(Long categoryId) {
        ProductCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCategory", categoryId));
        if (!JewelleryCategories.requiresSubcategory(category.getName())) {
            throw new BusinessException("Sub categories are only for Diamond, Gold, and PT");
        }
        return category;
    }

    private int nextSortOrder(Long categoryId) {
        return subcategoryRepository.findByCategoryIdOrderBySortOrderAscNameAsc(categoryId).stream()
                .mapToInt(ShowcaseSubcategory::getSortOrder)
                .max()
                .orElse(0) + 1;
    }

    private ShowcaseSubcategoryResponse toResponse(ShowcaseSubcategory sc) {
        long count = itemRepository.countBySubcategoryEntity_Id(sc.getId());
        return new ShowcaseSubcategoryResponse(
                sc.getId(),
                sc.getCategory().getId(),
                sc.getCategory().getName(),
                sc.getName(),
                sc.getSortOrder(),
                sc.isActive(),
                count
        );
    }
}
