package com.salecrm.showcase.entity;

import com.salecrm.branch.entity.Branch;
import com.salecrm.common.entity.BaseEntity;
import com.salecrm.product.entity.ProductCategory;
import com.salecrm.showcase.entity.ShowcaseSubcategory;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Branch / shop operational showcase piece (internal inventory display).
 */
@Entity
@Table(name = "showcase_items", uniqueConstraints = {
        @UniqueConstraint(name = "uk_showcase_branch_code", columnNames = {"branch_id", "item_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShowcaseItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(name = "item_code", nullable = false, length = 80)
    private String itemCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", foreignKey = @ForeignKey(name = "fk_showcase_category"))
    private ProductCategory categoryEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subcategory_id", foreignKey = @ForeignKey(name = "fk_showcase_subcategory"))
    private ShowcaseSubcategory subcategoryEntity;

    @Column(name = "sub_category", length = 100)
    private String subCategory;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "price_mmk", precision = 14, scale = 2)
    private BigDecimal priceMmk;

    @Column(name = "metal_purity", length = 80)
    private String metalPurity;

    @Column(name = "weight_gram", precision = 12, scale = 3)
    private BigDecimal weightGram;

    @Column(name = "stone_carat", precision = 12, scale = 3)
    private BigDecimal stoneCarat;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<ShowcaseImage> images = new ArrayList<>();

    public void addImage(ShowcaseImage image) {
        images.add(image);
        image.setItem(this);
    }

    public void clearImages() {
        for (ShowcaseImage image : images) {
            image.setItem(null);
        }
        images.clear();
    }
}
