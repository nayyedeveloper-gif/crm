package com.salecrm.nrc.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "nrcs", indexes = {
        @Index(name = "idx_nrc_code", columnList = "nrc_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Nrc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name_en", nullable = false, length = 50)
    private String nameEn;

    @Column(name = "name_mm", nullable = false, length = 120)
    private String nameMm;

    @Column(name = "nrc_code", nullable = false)
    private int nrcCode;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
