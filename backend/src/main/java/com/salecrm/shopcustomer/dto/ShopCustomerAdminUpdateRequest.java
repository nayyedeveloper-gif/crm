package com.salecrm.shopcustomer.dto;

import com.salecrm.shopcustomer.ShopCustomerTier;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ShopCustomerAdminUpdateRequest(
        @NotNull ShopCustomerTier customerTier,
        @NotNull Boolean trusted,
        @NotNull Boolean active,
        @Size(max = 2000) String crmNote
) {
}
