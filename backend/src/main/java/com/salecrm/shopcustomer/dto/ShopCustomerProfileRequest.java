package com.salecrm.shopcustomer.dto;

import java.time.LocalDate;

public record ShopCustomerProfileRequest(
        String fullName,
        String phone,
        LocalDate birthday,
        String address,
        String avatarUrl
) {
}
