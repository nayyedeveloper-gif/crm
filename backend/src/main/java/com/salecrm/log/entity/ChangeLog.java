package com.salecrm.log.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "change_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category", nullable = false, length = 60)
    private String category;

    @Column(name = "action", nullable = false, length = 60)
    private String action;

    @Column(name = "summary", nullable = false, length = 500)
    private String summary;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "actor", length = 120)
    private String actor;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
