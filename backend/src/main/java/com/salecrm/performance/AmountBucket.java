package com.salecrm.performance;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.List;

/**
 * Amount performance buckets.
 * CRM amounts are stored in MMK; buckets are evaluated in သိန်း (100,000 MMK).
 */
public enum AmountBucket {
    B_50_100("50 - 100 ကြား", new BigDecimal("50"), new BigDecimal("100")),
    B_100_300("100 - 300 ကြား", new BigDecimal("100"), new BigDecimal("300")),
    B_300_500("300 - 500 ကြား", new BigDecimal("300"), new BigDecimal("500")),
    B_500_1000("500 - 1000 ကြား", new BigDecimal("500"), new BigDecimal("1000")),
    B_1000_PLUS("1000 ထက်", new BigDecimal("1000"), null),
    OTHER("OTHER", null, new BigDecimal("50"));

    public static final BigDecimal THIEN = new BigDecimal("100000");

    private final String labelMm;
    private final BigDecimal minInclusive; // သိန်း
    private final BigDecimal maxExclusive; // သိန်း

    AmountBucket(String labelMm, BigDecimal minInclusive, BigDecimal maxExclusive) {
        this.labelMm = labelMm;
        this.minInclusive = minInclusive;
        this.maxExclusive = maxExclusive;
    }

    public String labelMm() {
        return labelMm;
    }

    public String code() {
        return name();
    }

    public static List<AmountBucket> ordered() {
        return Arrays.asList(B_50_100, B_100_300, B_300_500, B_500_1000, B_1000_PLUS, OTHER);
    }

    public static BigDecimal toThien(BigDecimal amountMmK) {
        if (amountMmK == null) {
            return BigDecimal.ZERO;
        }
        return amountMmK.divide(THIEN, 4, RoundingMode.HALF_UP);
    }

    public static AmountBucket fromAmount(BigDecimal amountMmK) {
        BigDecimal thien = toThien(amountMmK);
        for (AmountBucket bucket : ordered()) {
            if (bucket.matches(thien)) {
                return bucket;
            }
        }
        return OTHER;
    }

    public boolean matches(BigDecimal thien) {
        if (this == OTHER) {
            return thien.compareTo(maxExclusive) < 0;
        }
        if (this == B_1000_PLUS) {
            return thien.compareTo(minInclusive) >= 0;
        }
        return thien.compareTo(minInclusive) >= 0 && thien.compareTo(maxExclusive) < 0;
    }
}
