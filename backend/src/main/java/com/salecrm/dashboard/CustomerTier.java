package com.salecrm.dashboard;

import java.math.BigDecimal;

/**
 * Customer tier based on lifetime CRM purchase amount (MMK).
 * Aligns with sales CM thresholds: CIP ≥1000သိန်း, VVIP ≥500, VIP ≥300, else CARE.
 */
public enum CustomerTier {
    CIP,
    VVIP,
    VIP,
    CARE;

    private static final BigDecimal CIP_MIN = new BigDecimal("100000000");
    private static final BigDecimal VVIP_MIN = new BigDecimal("50000000");
    private static final BigDecimal VIP_MIN = new BigDecimal("30000000");

    public static CustomerTier fromAmount(BigDecimal totalAmount) {
        BigDecimal amt = totalAmount == null ? BigDecimal.ZERO : totalAmount;
        if (amt.compareTo(CIP_MIN) >= 0) {
            return CIP;
        }
        if (amt.compareTo(VVIP_MIN) >= 0) {
            return VVIP;
        }
        if (amt.compareTo(VIP_MIN) >= 0) {
            return VIP;
        }
        return CARE;
    }
}
