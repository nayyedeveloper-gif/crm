package com.salecrm.shopcustomer.dto;

import org.springframework.lang.NonNull;

public record ShopAuthResponse(
        @NonNull String accessToken,
        long expiresIn,
        @NonNull ShopCustomerResponse customer,
        boolean needsProfile
) {
}
