package com.salecrm.location.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Township (မြို့နယ်) belonging to a Region.
 */
@Entity
@Table(name = "townships", indexes = {
        @Index(name = "idx_township_region", columnList = "region_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Township {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false, foreignKey = @ForeignKey(name = "fk_township_region"))
    private Region region;

    @Column(name = "name_mm", nullable = false, length = 120)
    private String nameMm;

    @Column(name = "name_en", length = 120)
    private String nameEn;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
