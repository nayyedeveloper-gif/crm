package com.salecrm.user.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.branch.repository.BranchRepository;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.security.SecurityUtils;
import com.salecrm.user.dto.UserCreateRequest;
import com.salecrm.user.dto.UserResponse;
import com.salecrm.user.dto.UserUpdateRequest;
import com.salecrm.user.entity.Role;
import com.salecrm.user.entity.User;
import com.salecrm.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class UserAdminService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<UserResponse> listAll() {
        return userRepository.findAllByOrderByUsernameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username().trim())) {
            throw new BusinessException("Username already exists");
        }
        Role role = request.role();
        Branch branch = resolveBranch(role, request.branchId());

        User user = User.builder()
                .username(request.username().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .role(role)
                .branch(branch)
                .active(request.active() == null || request.active())
                .build();

        User saved = userRepository.save(user);
        auditLogService.change("USERS", "CREATE", "User created: " + saved.getUsername(),
                "role=" + saved.getRole() + " branch="
                        + (saved.getBranch() != null ? saved.getBranch().getName() : "none"));
        return toResponse(saved);
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        Long currentId = SecurityUtils.requireCurrentUser().getId();
        if (currentId.equals(id) && Boolean.FALSE.equals(request.active())) {
            throw new BusinessException("You cannot deactivate your own account");
        }
        if (currentId.equals(id) && request.role() != Role.ADMIN) {
            throw new BusinessException("You cannot remove your own ADMIN role");
        }

        Role role = request.role();
        Branch branch = resolveBranch(role, request.branchId());

        user.setFullName(request.fullName().trim());
        user.setRole(role);
        user.setBranch(branch);
        user.setActive(request.active());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        User saved = userRepository.save(user);
        auditLogService.change("USERS", "UPDATE", "User updated: " + saved.getUsername(),
                "role=" + saved.getRole() + " active=" + saved.isActive());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        Long currentId = SecurityUtils.requireCurrentUser().getId();
        if (currentId.equals(id)) {
            throw new BusinessException("You cannot delete your own account");
        }
        if (user.getRole() == Role.ADMIN && user.isActive()
                && userRepository.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw new BusinessException("Cannot delete the last active admin account");
        }

        userRepository.delete(user);
        auditLogService.change("USERS", "DELETE", "User deleted: " + user.getUsername(),
                "id=" + id);
    }

    private Branch resolveBranch(Role role, Long branchId) {
        if (branchId == null) {
            return null;
        }
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", branchId));
    }

    private static String branchLabel(User user) {
        Branch branch = user.getBranch();
        if (branch != null) {
            return branch.getName();
        }
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER || user.getRole() == Role.STAFF) {
            return "All branches";
        }
        return null;
    }

    private UserResponse toResponse(User user) {
        Branch branch = user.getBranch();
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name(),
                branch != null ? branch.getId() : null,
                branchLabel(user),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
