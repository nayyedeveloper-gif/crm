package com.salecrm.product.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "products", uniqueConstraints = {
        @UniqueConstraint(name = "uk_products_public_code", columnNames = "public_code"),
        @UniqueConstraint(name = "uk_products_product_code", columnNames = "product_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Manual business product code (e.g. GD-0001). Not auto-generated. */
    @Column(name = "product_code", nullable = false, length = 80)
    private String productCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /** Denormalized category name for quick display / public API. */
    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_products_category"))
    private ProductCategory categoryEntity;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Optional display price in MMK. Null = price on inquiry. */
    @Column(name = "price", precision = 18, scale = 2)
    private java.math.BigDecimal price;

    /** Original / before-discount price. When &gt; price, shop shows special discount. */
    @Column(name = "compare_at_price", precision = 18, scale = 2)
    private java.math.BigDecimal compareAtPrice;

    @Column(name = "featured", nullable = false)
    @Builder.Default
    private boolean featured = false;

    /** Limited Time / Special offer spotlight on storefront. */
    @Column(name = "special_offer", nullable = false)
    @Builder.Default
    private boolean specialOffer = false;

    @Column(name = "offer_ends_at")
    private java.time.Instant offerEndsAt;

    /** Optional override, e.g. "Limited Time Offer". */
    @Column(name = "offer_headline", length = 80)
    private String offerHeadline;

    /** e.g. 18K, 22K, PT950 */
    @Column(name = "metal_purity", length = 40)
    private String metalPurity;

    @Column(name = "weight_gram", precision = 12, scale = 3)
    private java.math.BigDecimal weightGram;

    @Column(name = "stone_carat", precision = 12, scale = 3)
    private java.math.BigDecimal stoneCarat;

    /** Opaque token embedded in public QR URL (/p/{publicCode}). */
    @Column(name = "public_code", nullable = false, length = 32, unique = true)
    private String publicCode;

    @Column(name = "image_front", length = 500)
    private String imageFront;

    @Column(name = "image_back", length = 500)
    private String imageBack;

    @Column(name = "image_side", length = 500)
    private String imageSide;

    @Column(name = "image_other", length = 500)
    private String imageOther;

    /** Dedicated Limited Offer / Special banner (full-bleed shop hero). */
    @Column(name = "image_offer", length = 500)
    private String imageOffer;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
