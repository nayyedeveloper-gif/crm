package com.salecrm.security;

import com.salecrm.shopcustomer.ShopCustomerPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = header.substring(BEARER.length());
            try {
                Claims claims = jwtService.parse(token);
                if (jwtService.isShopAccessToken(claims)) {
                    Long cid = requireLongClaim(claims, "cid");
                    String email = claims.get("email", String.class);
                    String fullName = claims.get("fullName", String.class);
                    Boolean profileComplete = claims.get("profileComplete", Boolean.class);
                    String username = email != null ? email : claims.getSubject();
                    if (username == null) {
                        throw new IllegalArgumentException("Shop token missing customer identity");
                    }
                    var principal = new ShopCustomerPrincipal(
                            cid,
                            username,
                            fullName,
                            Boolean.TRUE.equals(profileComplete),
                            true
                    );
                    var authentication = new UsernamePasswordAuthenticationToken(
                            principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else if (jwtService.isAccessToken(claims)) {
                    String subject = claims.getSubject();
                    if (subject == null || subject.isBlank()) {
                        throw new IllegalArgumentException("Access token missing subject");
                    }
                    UserDetails userDetails = userDetailsService.loadUserByUsername(subject);
                    if (userDetails.isEnabled()) {
                        var authentication = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (JwtException | IllegalArgumentException | NullPointerException ex) {
                log.debug("Invalid JWT: {}", ex.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }

    private static Long requireLongClaim(Claims claims, String name) {
        Number value = claims.get(name, Number.class);
        if (value == null) {
            throw new IllegalArgumentException("Missing claim: " + name);
        }
        return value.longValue();
    }
}
