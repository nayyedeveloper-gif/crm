package com.salecrm.dashboard.dto;

import java.math.BigDecimal;

public record NamedCount(String name, long count, BigDecimal amount) {
}
