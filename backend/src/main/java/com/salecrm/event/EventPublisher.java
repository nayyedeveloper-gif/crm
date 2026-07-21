package com.salecrm.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Publishes domain and audit events to Kafka.
 * Uses async dispatch so the request thread is never blocked by the broker.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnBean(KafkaTemplate.class)
@SuppressWarnings("null")
public class EventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.crm-history-events}")
    private String crmHistoryEventsTopic;

    @Value("${app.kafka.topics.audit-events}")
    private String auditEventsTopic;

    @Async
    public void publishCrmHistoryEvent(CrmHistoryEvent event) {
        try {
            kafkaTemplate.send(crmHistoryEventsTopic,
                    String.valueOf(event.crmHistoryId()), event);
            log.debug("Published CRM history event: id={}, action={}",
                    event.crmHistoryId(), event.action());
        } catch (Exception ex) {
            log.warn("Failed to publish CRM history event: {}", ex.getMessage());
        }
    }

    @Async
    public void publishAuditEvent(AuditEvent event) {
        try {
            kafkaTemplate.send(auditEventsTopic, event.eventType(), event);
            log.debug("Published audit event: type={}, resource={}/{}",
                    event.eventType(), event.resourceType(), event.resourceId());
        } catch (Exception ex) {
            log.warn("Failed to publish audit event: {}", ex.getMessage());
        }
    }
}
