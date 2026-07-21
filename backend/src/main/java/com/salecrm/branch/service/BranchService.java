package com.salecrm.branch.service;

import com.salecrm.branch.dto.BranchRequest;
import com.salecrm.branch.dto.BranchResponse;
import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.config.RedisConfig;
import com.salecrm.crmhistory.repository.CrmHistoryRepository;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.performance.repository.StaffPerformanceTargetRepository;
import com.salecrm.showcase.repository.ShowcaseItemRepository;
import com.salecrm.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class BranchService {

    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final CrmHistoryRepository crmHistoryRepository;
    private final ShowcaseItemRepository showcaseItemRepository;
    private final StaffPerformanceTargetRepository performanceTargetRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_BRANCHES, key = "'active'")
    public List<BranchResponse> findAllActive() {
        return branchRepository.findAllByActiveTrueOrderByCodeAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> findAll() {
        return branchRepository.findAllByOrderByCodeAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = RedisConfig.CACHE_BRANCHES, key = "'active'"),
            @CacheEvict(value = RedisConfig.CACHE_BRANCHES, allEntries = true)
    })
    public BranchResponse create(BranchRequest request) {
        String code = normalizeCode(request.code());
        if (!StringUtils.hasText(request.name())) {
            throw new BusinessException("Name is required");
        }
        if (branchRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessException("Branch code already exists: " + code);
        }
        Branch branch = Branch.builder()
                .code(code)
                .name(request.name().trim())
                .phone(blankToNull(request.phone()))
                .address(blankToNull(request.address()))
                .active(request.active() == null || Boolean.TRUE.equals(request.active()))
                .build();
        Branch saved = branchRepository.save(branch);
        auditLogService.change("BRANCHES", "CREATE",
                "Branch created: " + saved.getCode() + " / " + saved.getName(), null);
        return toResponse(saved);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = RedisConfig.CACHE_BRANCHES, key = "'active'"),
            @CacheEvict(value = RedisConfig.CACHE_BRANCHES, allEntries = true)
    })
    public BranchResponse update(Long id, BranchRequest request) {
        Branch branch = require(id);
        String code = normalizeCode(request.code());
        if (!StringUtils.hasText(request.name())) {
            throw new BusinessException("Name is required");
        }
        if (branchRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new BusinessException("Branch code already exists: " + code);
        }
        branch.setCode(code);
        branch.setName(request.name().trim());
        branch.setPhone(blankToNull(request.phone()));
        branch.setAddress(blankToNull(request.address()));
        if (request.active() != null) {
            branch.setActive(request.active());
        }
        Branch saved = branchRepository.save(branch);
        auditLogService.change("BRANCHES", "UPDATE",
                "Branch updated: " + saved.getCode() + " / " + saved.getName(),
                "active=" + saved.isActive());
        return toResponse(saved);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = RedisConfig.CACHE_BRANCHES, key = "'active'"),
            @CacheEvict(value = RedisConfig.CACHE_BRANCHES, allEntries = true)
    })
    public void delete(Long id) {
        Branch branch = require(id);
        ensureDeletable(id, branch.getCode());
        branchRepository.delete(branch);
        auditLogService.change("BRANCHES", "DELETE",
                "Branch deleted: " + branch.getCode() + " / " + branch.getName(), null);
    }

    private void ensureDeletable(Long id, String code) {
        long users = userRepository.countByBranchId(id);
        if (users > 0) {
            throw new BusinessException(
                    "Cannot delete branch " + code + ": " + users + " user(s) assigned. Reassign users first.",
                    HttpStatus.CONFLICT);
        }
        long crm = crmHistoryRepository.countByBranchId(id);
        if (crm > 0) {
            throw new BusinessException(
                    "Cannot delete branch " + code + ": " + crm + " CRM record(s) exist.",
                    HttpStatus.CONFLICT);
        }
        long showcase = showcaseItemRepository.countByBranchId(id);
        if (showcase > 0) {
            throw new BusinessException(
                    "Cannot delete branch " + code + ": " + showcase + " Show Case item(s) exist.",
                    HttpStatus.CONFLICT);
        }
        long targets = performanceTargetRepository.countByBranchId(id);
        if (targets > 0) {
            throw new BusinessException(
                    "Cannot delete branch " + code + ": " + targets + " performance target(s) exist.",
                    HttpStatus.CONFLICT);
        }
    }

    private Branch require(Long id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", id));
    }

    private static String normalizeCode(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new BusinessException("Code is required");
        }
        return raw.trim().toUpperCase();
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private BranchResponse toResponse(Branch b) {
        return new BranchResponse(b.getId(), b.getCode(), b.getName(),
                b.getPhone(), b.getAddress(), b.isActive());
    }
}
