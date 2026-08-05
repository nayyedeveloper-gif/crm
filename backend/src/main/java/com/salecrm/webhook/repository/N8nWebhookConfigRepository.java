package com.salecrm.webhook.repository;

import com.salecrm.webhook.entity.N8nWebhookConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface N8nWebhookConfigRepository extends JpaRepository<N8nWebhookConfig, Long> {
}
