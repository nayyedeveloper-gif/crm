package com.salecrm.shopcustomer;

import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/** Principal for authenticated shop customers (separate from staff UserPrincipal). */
public record ShopCustomerPrincipal(
        @NonNull Long id,
        @NonNull String email,
        @Nullable String fullName,
        boolean profileComplete,
        boolean active
) implements UserDetails {

    public static ShopCustomerPrincipal from(@NonNull ShopCustomer c) {
        Long id = c.getId();
        String email = c.getEmail();
        if (id == null || email == null) {
            throw new IllegalStateException("Shop customer missing id or email");
        }
        return new ShopCustomerPrincipal(
                id,
                email,
                c.getFullName(),
                c.isProfileComplete(),
                c.isActive()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_SHOP_CUSTOMER"));
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
