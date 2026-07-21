package com.salecrm.shopcustomer.dto;

import com.salecrm.shopcustomer.ShopCustomer;
import com.salecrm.shopcustomer.ShopCustomerTier;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.time.Instant;
import java.time.LocalDate;

public record ShopCustomerResponse(
        @NonNull Long id,
        @NonNull String email,
        @Nullable String fullName,
        @Nullable String phone,
        @Nullable LocalDate birthday,
        @Nullable String address,
        @Nullable String avatarUrl,
        boolean profileComplete,
        boolean active,
        @NonNull ShopCustomerTier customerTier,
        boolean trusted,
        @Nullable String crmNote,
        @NonNull Instant createdAt,
        @Nullable Instant updatedAt
) {
    public static ShopCustomerResponse from(@NonNull ShopCustomer c) {
        Long id = c.getId();
        String email = c.getEmail();
        Instant createdAt = c.getCreatedAt();
        ShopCustomerTier tier = c.getCustomerTier() != null ? c.getCustomerTier() : ShopCustomerTier.CUSTOMER;
        if (id == null || email == null || createdAt == null) {
            throw new IllegalStateException("Shop customer missing required fields");
        }
        return new ShopCustomerResponse(
                id,
                email,
                c.getFullName(),
                c.getPhone(),
                c.getBirthday(),
                c.getAddress(),
                c.getAvatarUrl(),
                c.isProfileComplete(),
                c.isActive(),
                tier,
                c.isTrusted(),
                c.getCrmNote(),
                createdAt,
                c.getUpdatedAt()
        );
    }
}
