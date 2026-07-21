package com.salecrm.sales.support;

import com.salecrm.branch.entity.Branch;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Maps CRM branch records to sales sheet branch labels (e.g. SHOP-01 → "Shop 1").
 */
public final class SalesBranchMapper {

    private static final Pattern SHOP_CODE = Pattern.compile("^SHOP-(\\d+)$", Pattern.CASE_INSENSITIVE);

    private SalesBranchMapper() {
    }

    public static List<String> salesBranchNames(Branch branch) {
        if (branch == null || branch.getCode() == null) {
            return List.of();
        }
        Matcher matcher = SHOP_CODE.matcher(branch.getCode().trim());
        if (matcher.matches()) {
            int shopNumber = Integer.parseInt(matcher.group(1));
            List<String> names = new ArrayList<>();
            names.add("Shop " + shopNumber);
            names.add("29 Shop " + shopNumber);
            names.add("29Shop" + shopNumber);
            return names;
        }
        if (branch.getName() != null && !branch.getName().isBlank()) {
            return List.of(branch.getName().trim());
        }
        return List.of(branch.getCode().trim());
    }
}
