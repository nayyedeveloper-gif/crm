package com.salecrm.showcase.util;

/**
 * Product categories that require a Show Case sub category (Diamond, Gold, PT).
 */
public final class JewelleryCategories {

    private JewelleryCategories() {
    }

    public static boolean requiresSubcategory(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return false;
        }
        String c = categoryName.trim().toLowerCase();
        return c.equals("diamond")
                || c.equals("gold")
                || c.equals("pt")
                || c.contains("diamond")
                || c.contains("gold")
                || c.contains("plat")
                || c.equals("dm")
                || c.equals("gd")
                || c.equals("au");
    }
}
