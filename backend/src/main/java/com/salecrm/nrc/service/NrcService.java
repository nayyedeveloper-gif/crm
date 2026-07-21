package com.salecrm.nrc.service;

import com.salecrm.config.RedisConfig;
import com.salecrm.nrc.dto.NrcResponse;
import com.salecrm.nrc.repository.NrcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NrcService {

    private final NrcRepository nrcRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_NRC, key = "'all'")
    public List<NrcResponse> findAll() {
        return nrcRepository.findAllByOrderByNrcCodeAscNameEnAsc().stream()
                .map(n -> new NrcResponse(n.getId(), n.getNameEn(), n.getNameMm(), n.getNrcCode(), n.getSortOrder()))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisConfig.CACHE_NRC, key = "#nrcCode")
    public List<NrcResponse> findByNrcCode(Integer nrcCode) {
        return nrcRepository.findAllByNrcCodeOrderByNameEnAsc(nrcCode).stream()
                .map(n -> new NrcResponse(n.getId(), n.getNameEn(), n.getNameMm(), n.getNrcCode(), n.getSortOrder()))
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
