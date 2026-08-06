package com.salecrm.legacy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.legacy-mysql")
public record LegacyMysqlProperties(
        boolean enabled,
        String url,
        String username,
        String password,
        Hikari hikari
) {
    public record Hikari(
            int maximumPoolSize,
            int minimumIdle,
            String poolName
    ) {
    }
}
