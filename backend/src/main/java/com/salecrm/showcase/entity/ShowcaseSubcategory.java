package com.salecrm.showcase.entity;

import com.salecrm.common.entity.BaseEntity;
import com.salecrm.product.entity.ProductCategory;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "showcase_subcategories", uniqueConstraints = {
        @UniqueConstraint(name = "uk_showcase_subcat_category_name", columnNames = {"category_id", "name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShowcaseSubcategory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private ProductCategory category;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
