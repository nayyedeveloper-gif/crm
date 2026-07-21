package com.salecrm.location.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * State / Region (ပြည်နယ်/တိုင်း). Reference data, cached in Redis.
 */
@Entity
@Table(name = "regions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_region_code", columnNames = "code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Region {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @Column(name = "name_mm", nullable = false, length = 120)
    private String nameMm;

    @Column(name = "name_en", length = 120)
    private String nameEn;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
