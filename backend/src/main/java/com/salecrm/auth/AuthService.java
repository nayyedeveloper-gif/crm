package com.salecrm.auth;

import com.salecrm.auth.dto.AuthResponse;
import com.salecrm.auth.dto.LoginRequest;
import com.salecrm.auth.dto.RefreshRequest;
import com.salecrm.common.exception.BusinessException;
import com.salecrm.security.JwtService;
import com.salecrm.security.UserPrincipal;
import com.salecrm.branch.repository.BranchRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final com.salecrm.security.CustomUserDetailsService userDetailsService;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return buildResponse(principal);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshRequest request) {
        try {
            Claims claims = jwtService.parse(request.refreshToken());
            if (!jwtService.isRefreshToken(claims)) {
                throw new BusinessException("Invalid refresh token", HttpStatus.UNAUTHORIZED);
            }
            UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(claims.getSubject());
            if (!principal.isEnabled()) {
                throw new BusinessException("Account disabled", HttpStatus.FORBIDDEN);
            }
            return buildResponse(principal);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new BusinessException("Invalid or expired refresh token", HttpStatus.UNAUTHORIZED);
        }
    }

    private AuthResponse buildResponse(UserPrincipal principal) {
        String branchName = null;
        if (principal.getBranchId() != null) {
            branchName = branchRepository.findById(principal.getBranchId())
                    .map(com.salecrm.branch.entity.Branch::getName).orElse(null);
        } else if (principal.isCrossBranch()) {
            branchName = "All branches";
        }

        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
                principal.getId(),
                principal.getUsername(),
                principal.getFullName(),
                principal.getRole().name(),
                principal.getBranchId(),
                branchName);

        return new AuthResponse(
                jwtService.generateAccessToken(principal),
                jwtService.generateRefreshToken(principal),
                "Bearer",
                jwtService.accessTokenTtlSeconds(),
                userInfo);
    }
}
