package com.salecrm.location.repository;

import com.salecrm.location.entity.Township;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TownshipRepository extends JpaRepository<Township, Long> {
    List<Township> findAllByRegionIdOrderBySortOrderAscNameMmAsc(Long regionId);
}
