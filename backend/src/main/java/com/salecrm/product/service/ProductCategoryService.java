package com.salecrm.product.service;

import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.product.dto.ProductCategoryRequest;
import com.salecrm.product.dto.ProductCategoryResponse;
import com.salecrm.product.entity.ProductCategory;
import com.salecrm.product.repository.ProductCategoryRepository;
import com.salecrm.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ProductCategoryService {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<ProductCategoryResponse> listAll() {
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductCategoryResponse> listActive() {
        return categoryRepository.findAllByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductCategoryResponse create(ProductCategoryRequest request) {
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("Category already exists: " + name);
        }
        ProductCategory category = ProductCategory.builder()
                .name(name)
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : nextSortOrder())
                .active(request.active() == null || Boolean.TRUE.equals(request.active()))
                .build();
        ProductCategory saved = categoryRepository.save(category);
        auditLogService.change("PRODUCT_CATEGORIES", "CREATE", "Category created: " + saved.getName(), null);
        return toResponse(saved);
    }

    @Transactional
    public ProductCategoryResponse update(Long id, ProductCategoryRequest request) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCategory", id));
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BusinessException("Category already exists: " + name);
        }
        category.setName(name);
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        category.setActive(request.active() == null || Boolean.TRUE.equals(request.active()));
        ProductCategory saved = categoryRepository.save(category);
        productRepository.syncCategoryName(saved.getId(), saved.getName());

        auditLogService.change("PRODUCT_CATEGORIES", "UPDATE", "Category updated: " + saved.getName(), null);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCategory", id));
        long count = productRepository.countByCategoryEntity_Id(id);
        if (count > 0) {
            throw new BusinessException(
                    "Cannot delete category in use by " + count + " product(s). Reassign products first.");
        }
        categoryRepository.delete(category);
        auditLogService.change("PRODUCT_CATEGORIES", "DELETE", "Category deleted: " + category.getName(), null);
    }

    private int nextSortOrder() {
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .mapToInt(ProductCategory::getSortOrder)
                .max()
                .orElse(0) + 1;
    }

    private ProductCategoryResponse toResponse(ProductCategory c) {
        long count = productRepository.countByCategoryEntity_Id(c.getId());
        return new ProductCategoryResponse(c.getId(), c.getName(), c.getSortOrder(), c.isActive(), count);
    }
}
