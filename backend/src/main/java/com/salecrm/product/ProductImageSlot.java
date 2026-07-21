package com.salecrm.product;

/**
 * Fixed image slots for product gallery / QR public view.
 */
public enum ProductImageSlot {
    FRONT,
    BACK,
    SIDE,
    OTHER,
    /** Full-bleed Limited Time / Special Offer banner (4:5). */
    OFFER;

    public static ProductImageSlot from(String raw) {
        return ProductImageSlot.valueOf(raw.trim().toUpperCase());
    }
}
