package com.salecrm.sales.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "sales_monthly_targets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_sales_monthly_targets", columnNames = {"month_label", "shop_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesMonthlyTarget extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "month_label", nullable = false, length = 32)
    private String monthLabel;

    @Column(name = "shop_name", nullable = false, length = 160)
    private String shopName;

    @Column(name = "company_total", nullable = false)
    @Builder.Default
    private boolean companyTotal = false;

    @Column(name = "diamond_qty", precision = 14, scale = 2)
    private BigDecimal diamondQty;

    @Column(name = "diamond_amount", precision = 18, scale = 2)
    private BigDecimal diamondAmount;

    @Column(name = "pt_qty", precision = 14, scale = 2)
    private BigDecimal ptQty;

    @Column(name = "pt_amount", precision = 18, scale = 2)
    private BigDecimal ptAmount;

    @Column(name = "gold15_qty", precision = 14, scale = 2)
    private BigDecimal gold15Qty;

    @Column(name = "gold15_amount", precision = 18, scale = 2)
    private BigDecimal gold15Amount;

    @Column(name = "gold16_qty", precision = 14, scale = 2)
    private BigDecimal gold16Qty;

    @Column(name = "gold16_amount", precision = 18, scale = 2)
    private BigDecimal gold16Amount;

    @Column(name = "total_qty", precision = 14, scale = 2)
    private BigDecimal totalQty;

    @Column(name = "total_amount", precision = 18, scale = 2)
    private BigDecimal totalAmount;
}
