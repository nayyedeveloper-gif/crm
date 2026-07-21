package com.salecrm.location.repository;

import com.salecrm.location.entity.Region;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RegionRepository extends JpaRepository<Region, Long> {
    List<Region> findAllByOrderBySortOrderAscNameMmAsc();
}
