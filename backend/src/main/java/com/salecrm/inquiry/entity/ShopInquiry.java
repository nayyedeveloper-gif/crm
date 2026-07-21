package com.salecrm.inquiry.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shop_inquiries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopInquiry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_name", nullable = false, length = 160)
    private String customerName;

    @Column(name = "phone", nullable = false, length = 40)
    private String phone;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "items_json", nullable = false, columnDefinition = "TEXT")
    private String itemsJson;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "NEW";
}
