package com.salecrm.branch.repository;

import com.salecrm.branch.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long> {

    List<Branch> findAllByActiveTrueOrderByCodeAsc();

    List<Branch> findAllByOrderByCodeAsc();

    Optional<Branch> findByCode(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}
