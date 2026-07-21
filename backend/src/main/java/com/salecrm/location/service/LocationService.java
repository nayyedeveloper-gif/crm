package com.salecrm.location.service;

import com.salecrm.config.RedisConfig;
import com.salecrm.location.dto.RegionResponse;
import com.salecrm.location.dto.TownshipResponse;
import com.salecrm.location.repository.RegionRepository;
import com.salecrm.location.repository.TownshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final RegionRepository regionRepository;
    private final TownshipRepository townshipRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_REGIONS, key = "'all'")
    public List<RegionResponse> findAllRegions() {
        // ArrayList (non-final) so Redis Jackson typing can round-trip the list
        return regionRepository.findAllByOrderBySortOrderAscNameMmAsc().stream()
                .map(r -> new RegionResponse(r.getId(), r.getCode(), r.getNameMm(), r.getNameEn(), r.getSortOrder()))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_TOWNSHIPS, key = "#regionId")
    public List<TownshipResponse> findTownshipsByRegion(Long regionId) {
        return townshipRepository.findAllByRegionIdOrderBySortOrderAscNameMmAsc(regionId).stream()
                .map(t -> new TownshipResponse(t.getId(), t.getRegion().getId(),
                        t.getNameMm(), t.getNameEn(), t.getSortOrder()))
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
