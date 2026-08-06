package com.salecrm.legacy.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import javax.sql.DataSource;

@Configuration
@ConditionalOnProperty(prefix = "app.legacy-mysql", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(LegacyMysqlProperties.class)
@RequiredArgsConstructor
public class LegacyDataSourceConfig {

    private final LegacyMysqlProperties properties;

    @Bean(name = "legacyDataSource", destroyMethod = "close")
    public HikariDataSource legacyDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(properties.url());
        ds.setUsername(properties.username());
        ds.setPassword(properties.password() == null ? "" : properties.password());
        ds.setPoolName(properties.hikari() != null && properties.hikari().poolName() != null
                ? properties.hikari().poolName()
                : "LegacyShopSalesHikari");
        ds.setMaximumPoolSize(properties.hikari() != null ? properties.hikari().maximumPoolSize() : 10);
        ds.setMinimumIdle(properties.hikari() != null ? properties.hikari().minimumIdle() : 2);
        ds.setReadOnly(true);
        return ds;
    }

    @Bean(name = "legacyJdbcTemplate")
    public NamedParameterJdbcTemplate legacyJdbcTemplate(
            @org.springframework.beans.factory.annotation.Qualifier("legacyDataSource") DataSource legacyDataSource) {
        return new NamedParameterJdbcTemplate(legacyDataSource);
    }
}
