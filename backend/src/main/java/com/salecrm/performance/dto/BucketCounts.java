package com.salecrm.performance.dto;

public record BucketCounts(int target, int actual, int uniquePhones) {
    public BucketCounts(int target, int actual) {
        this(target, actual, 0);
    }
}
