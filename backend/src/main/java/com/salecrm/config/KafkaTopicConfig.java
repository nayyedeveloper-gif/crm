package com.salecrm.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;

@Configuration
@SuppressWarnings("null")
@ConditionalOnBean(KafkaAdmin.class)
public class KafkaTopicConfig {

    @Bean
    public NewTopic crmHistoryEventsTopic(@Value("${app.kafka.topics.crm-history-events}") String topic) {
        return TopicBuilder.name(topic).partitions(6).replicas(1).build();
    }

    @Bean
    public NewTopic auditEventsTopic(@Value("${app.kafka.topics.audit-events}") String topic) {
        return TopicBuilder.name(topic).partitions(3).replicas(1).build();
    }
}
