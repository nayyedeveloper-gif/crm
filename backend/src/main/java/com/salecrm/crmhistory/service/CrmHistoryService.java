package com.salecrm.crmhistory.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.config.RedisConfig;
import com.salecrm.common.exception.ForbiddenBranchAccessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.common.web.PageResponse;
import com.salecrm.crmhistory.dto.*;
import com.salecrm.crmhistory.entity.CrmHistory;
import com.salecrm.crmhistory.repository.CrmHistoryRepository;
import com.salecrm.event.CrmHistoryEvent;
import com.salecrm.event.EventPublisher;
import com.salecrm.location.entity.Region;
import com.salecrm.location.entity.Township;
import com.salecrm.location.repository.RegionRepository;
import com.salecrm.location.repository.TownshipRepository;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class CrmHistoryService {

    private final CrmHistoryRepository crmHistoryRepository;
    private final BranchRepository branchRepository;
    private final RegionRepository regionRepository;
    private final TownshipRepository townshipRepository;
    private final ObjectProvider<EventPublisher> eventPublisherProvider;

    @Transactional(readOnly = true)
    public PageResponse<CrmHistoryResponse> list(CrmHistoryFilter filter, int page, int size) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        Long effectiveBranchId = resolveBranchId(user, filter.branchId());

        CrmHistoryFilter scopedFilter = new CrmHistoryFilter(
                effectiveBranchId, filter.search(), filter.actionType(),
                filter.phone(), filter.regionId(), filter.townshipId()
        );

        PageRequest pageRequest = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<CrmHistory> result = crmHistoryRepository
                .findAll(CrmHistorySpec.withFilter(scopedFilter), pageRequest);

        return PageResponse.of(result, this::toResponse);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_CRM_HISTORY, key = "#id")
    public CrmHistoryResponse getById(Long id) {
        CrmHistory entity = crmHistoryRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM History", id));
        ensureBranchAccess(entity.getBranch().getId());
        return toResponse(entity);
    }

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_CRM_HISTORY, key = "#result.id")
    public CrmHistoryResponse create(CrmHistoryRequest request) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        Long branchId = user.isCrossBranch() && request.branchId() != null
                ? request.branchId()
                : user.getBranchId();
        if (branchId == null) {
            throw new ForbiddenBranchAccessException();
        }

        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", branchId));

        CrmHistory entity = CrmHistory.builder()
                .branch(branch)
                .customerName(request.customerName())
                .phone(request.phone())
                .birthday(request.birthday())
                .amount(request.amount() != null ? request.amount() : BigDecimal.ZERO)
                .actionType(request.actionType() != null ? request.actionType() : com.salecrm.crmhistory.entity.ActionType.PURCHASE)
                .region(resolveRegion(request.regionId()))
                .township(resolveTownship(request.townshipId()))
                .nrc(request.nrc())
                .address(request.address())
                .remark(request.remark())
                .build();

        entity = crmHistoryRepository.save(entity);

        publishEvent(new CrmHistoryEvent(
                entity.getId(), branchId, CrmHistoryEvent.ACTION_CREATED,
                user.getFullName(), Instant.now()));

        return toResponse(entity);
    }

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_CRM_HISTORY, key = "#id")
    public CrmHistoryResponse update(Long id, CrmHistoryRequest request) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        CrmHistory entity = crmHistoryRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM History", id));
        ensureBranchAccess(entity.getBranch().getId());

        // Allow cross-branch users to move record to another branch
        if (user.isCrossBranch() && request.branchId() != null
                && !request.branchId().equals(entity.getBranch().getId())) {
            Branch newBranch = branchRepository.findById(request.branchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Branch", request.branchId()));
            entity.setBranch(newBranch);
        }

        entity.setCustomerName(request.customerName());
        entity.setPhone(request.phone());
        entity.setBirthday(request.birthday());
        entity.setAmount(request.amount() != null ? request.amount() : BigDecimal.ZERO);
        entity.setActionType(request.actionType() != null ? request.actionType() : entity.getActionType());
        entity.setRegion(resolveRegion(request.regionId()));
        entity.setTownship(resolveTownship(request.townshipId()));
        entity.setNrc(request.nrc());
        entity.setAddress(request.address());
        entity.setRemark(request.remark());

        entity = crmHistoryRepository.save(entity);

        publishEvent(new CrmHistoryEvent(
                entity.getId(), entity.getBranch().getId(), CrmHistoryEvent.ACTION_UPDATED,
                user.getFullName(), Instant.now()));

        return toResponse(entity);
    }

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_CRM_HISTORY, key = "#id")
    public void delete(Long id) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        CrmHistory entity = crmHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM History", id));
        ensureBranchAccess(entity.getBranch().getId());

        crmHistoryRepository.delete(entity);

        publishEvent(new CrmHistoryEvent(
                id, entity.getBranch().getId(), CrmHistoryEvent.ACTION_DELETED,
                user.getFullName(), Instant.now()));
    }

    private Long resolveBranchId(UserPrincipal user, Long requestedBranchId) {
        if (user.isCrossBranch()) {
            return requestedBranchId;
        }
        return user.getBranchId();
    }

    private void ensureBranchAccess(Long recordBranchId) {
        UserPrincipal user = SecurityUtils.requireCurrentUser();
        if (!user.isCrossBranch() && !recordBranchId.equals(user.getBranchId())) {
            throw new ForbiddenBranchAccessException();
        }
    }

    private void publishEvent(CrmHistoryEvent event) {
        EventPublisher publisher = eventPublisherProvider.getIfAvailable();
        if (publisher != null) {
            publisher.publishCrmHistoryEvent(event);
        }
    }

    private Region resolveRegion(Long regionId) {
        if (regionId == null) return null;
        return regionRepository.findById(regionId)
                .orElseThrow(() -> new ResourceNotFoundException("Region", regionId));
    }

    private Township resolveTownship(Long townshipId) {
        if (townshipId == null) return null;
        return townshipRepository.findById(townshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Township", townshipId));
    }

    public CrmHistoryResponse toResponse(CrmHistory entity) {
        return new CrmHistoryResponse(
                entity.getId(),
                entity.getVersion(),
                entity.getBranch().getId(),
                entity.getBranch().getName(),
                entity.getCustomerName(),
                entity.getPhone(),
                entity.getBirthday(),
                entity.getAmount(),
                entity.getActionType(),
                entity.getRegion() != null ? entity.getRegion().getId() : null,
                entity.getRegion() != null ? entity.getRegion().getNameMm() : null,
                entity.getTownship() != null ? entity.getTownship().getId() : null,
                entity.getTownship() != null ? entity.getTownship().getNameMm() : null,
                entity.getNrc(),
                entity.getAddress(),
                entity.getRemark(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy()
        );
    }
}
