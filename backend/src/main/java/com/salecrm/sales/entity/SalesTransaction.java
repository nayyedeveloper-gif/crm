package com.salecrm.sales.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "sales_transactions", indexes = {
        @Index(name = "idx_sales_tx_sale_date", columnList = "sale_date"),
        @Index(name = "idx_sales_tx_branch", columnList = "branch_name"),
        @Index(name = "idx_sales_tx_reason", columnList = "reason")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesTransaction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_ts", length = 48)
    private String transactionTs;

    @Column(name = "sale_date")
    private LocalDate saleDate;

    @Column(name = "branch_name", nullable = false, length = 160)
    private String branchName;

    @Column(name = "reason", length = 120)
    private String reason;

    @Column(name = "sales_staff", length = 160)
    private String salesStaff;

    @Column(name = "customer_service", length = 160)
    private String customerService;

    @Column(name = "buyer_name", length = 200)
    private String buyerName;

    @Column(name = "contact_number", length = 80)
    private String contactNumber;

    @Column(name = "township", length = 120)
    private String township;

    @Column(name = "region", length = 120)
    private String region;

    @Column(name = "customer_type", length = 80)
    private String customerType;

    @Column(name = "group_size")
    private Integer groupSize;

    @Column(name = "qty", precision = 14, scale = 3)
    private BigDecimal qty;

    @Column(name = "gram", precision = 16, scale = 4)
    private BigDecimal gram;

    @Column(name = "amount", precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "item_category", length = 160)
    private String itemCategory;

    @Column(name = "item_main_group", length = 160)
    private String itemMainGroup;

    @Column(name = "items_code", length = 120)
    private String itemsCode;

    @Column(name = "purity", length = 40)
    private String purity;

    @Column(name = "special_event", length = 240)
    private String specialEvent;

    @Column(name = "buyer_nrc", length = 80)
    private String buyerNrc;

    @Column(name = "form_extra", columnDefinition = "TEXT")
    private String formExtra;
}
