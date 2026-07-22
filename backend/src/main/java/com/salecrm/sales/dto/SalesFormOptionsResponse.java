package com.salecrm.sales.dto;

import java.util.List;

public record SalesFormOptionsResponse(
        List<String> itemMainGroups,
        List<String> itemCategories,
        List<String> purities,
        List<String> reasons,
        List<String> customerTypes,
        List<String> newReturnOptions,
        List<String> transactionTypes,
        List<String> prefixes,
        List<String> onOffOptions,
        List<String> itemTypes,
        List<String> keyAccountOptions,
        List<String> salesStaffNames
) {
}
