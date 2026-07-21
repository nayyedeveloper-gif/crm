package com.salecrm.config;

import com.salecrm.security.SecurityUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

@Configuration
public class JpaAuditingConfig {

    /**
     * Records the acting user's full name (e.g. "ဆိုင်အမှတ်(၃) Staff") on created_by / updated_by.
     */
    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> SecurityUtils.currentUser()
                .map(u -> u.getFullName() != null ? u.getFullName() : u.getUsername())
                .or(() -> Optional.of("system"));
    }
}
