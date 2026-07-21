package com.salecrm.permission.repository;

import com.salecrm.permission.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findAllByOrderByPermissionKeyAscRoleAsc();

    Optional<RolePermission> findByPermissionKeyAndRole(String permissionKey, String role);
}
