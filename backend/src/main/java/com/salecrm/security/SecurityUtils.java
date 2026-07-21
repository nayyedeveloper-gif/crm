package com.salecrm.security;

import com.salecrm.common.exception.BusinessException;
import com.salecrm.shopcustomer.ShopCustomerPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<UserPrincipal> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public static UserPrincipal requireCurrentUser() {
        return currentUser().orElseThrow(
                () -> new BusinessException("Not authenticated", HttpStatus.UNAUTHORIZED));
    }

    public static @NonNull ShopCustomerPrincipal requireShopCustomer(ShopCustomerPrincipal principal) {
        if (principal == null) {
            throw new BusinessException("Not authenticated", HttpStatus.UNAUTHORIZED);
        }
        return principal;
    }
}
