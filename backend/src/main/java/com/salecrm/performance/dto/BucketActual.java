package com.salecrm.performance.dto;

/** Record count + distinct phone count for a bucket cell. */
public record BucketActual(int count, int uniquePhones) {
}
