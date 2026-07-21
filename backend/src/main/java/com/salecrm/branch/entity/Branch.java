package com.salecrm.branch.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * A shop / branch. The CRM is designed for ~10 of these operating concurrently.
 */
@Entity
@Table(name = "branches", uniqueConstraints = {
        @UniqueConstraint(name = "uk_branch_code", columnNames = "code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Branch extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 40)
    private String code;

    @Column(name = "name", nullable = false, length = 160)
    private String name;

    @Column(name = "phone", length = 40)
    private String phone;

    @Column(name = "address", length = 400)
    private String address;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
