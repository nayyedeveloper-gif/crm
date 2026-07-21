package com.salecrm.user.service;

import com.salecrm.branch.entity.Branch;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.log.service.AuditLogService;
import com.salecrm.security.SecurityUtils;
import com.salecrm.security.UserPrincipal;
import com.salecrm.user.dto.ChangePasswordRequest;
import com.salecrm.user.dto.ProfileUpdateRequest;
import com.salecrm.user.dto.UserResponse;
import com.salecrm.user.entity.User;
import com.salecrm.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public UserResponse me() {
        return toResponse(loadCurrent());
    }

    @Transactional
    public UserResponse updateProfile(ProfileUpdateRequest request) {
        User user = loadCurrent();
        user.setFullName(request.fullName().trim());
        User saved = userRepository.save(user);
        auditLogService.change("PROFILE", "UPDATE", "Profile updated: " + saved.getUsername(),
                "fullName=" + saved.getFullName());
        return toResponse(saved);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = loadCurrent();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessException("New password must be different from current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditLogService.change("PROFILE", "PASSWORD", "Password changed: " + user.getUsername(), null);
    }

    private User loadCurrent() {
        UserPrincipal principal = SecurityUtils.requireCurrentUser();
        return userRepository.findWithBranchById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }

    private UserResponse toResponse(User user) {
        Branch branch = user.getBranch();
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name(),
                branch != null ? branch.getId() : null,
                branch != null ? branch.getName()
                        : (user.getRole().name().equals("ADMIN")
                        || user.getRole().name().equals("MANAGER")
                        || user.getRole().name().equals("STAFF") ? "All branches" : null),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
