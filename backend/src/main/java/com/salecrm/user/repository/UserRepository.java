package com.salecrm.user.repository;

import com.salecrm.user.entity.Role;
import com.salecrm.user.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = "branch")
    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    @EntityGraph(attributePaths = "branch")
    Optional<User> findWithBranchById(Long id);

    @EntityGraph(attributePaths = "branch")
    List<User> findAllByOrderByUsernameAsc();

    long countByBranchId(Long branchId);

    long countByRoleAndActiveTrue(Role role);
}
