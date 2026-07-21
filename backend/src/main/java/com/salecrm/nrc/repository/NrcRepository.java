package com.salecrm.nrc.repository;

import com.salecrm.nrc.entity.Nrc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NrcRepository extends JpaRepository<Nrc, Long> {
    List<Nrc> findAllByNrcCodeOrderByNameEnAsc(Integer nrcCode);
    List<Nrc> findAllByOrderByNrcCodeAscNameEnAsc();
}
