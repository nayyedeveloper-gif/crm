package com.salecrm.order.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "shop_orders", uniqueConstraints = {
        @UniqueConstraint(name = "uk_shop_orders_code", columnNames = "order_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopOrder extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", nullable = false, length = 32)
    private String orderCode;

    @Column(name = "customer_name", nullable = false, length = 160)
    private String customerName;

    @Column(name = "phone", nullable = false, length = 40)
    private String phone;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "items_json", nullable = false, columnDefinition = "TEXT")
    private String itemsJson;

    @Column(name = "total_amount", precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "status", nullable = false, length = 40)
    @Builder.Default
    private String status = "PENDING_PAYMENT";

    @Column(name = "tracking_number", length = 120)
    private String trackingNumber;

    @Column(name = "payment_method", length = 40)
    private String paymentMethod;

    @Column(name = "payment_ref", length = 160)
    private String paymentRef;

    /** UNPAID | PAID | REFUNDED — admin-managed until MMQR is enabled. */
    @Column(name = "payment_status", nullable = false, length = 20)
    @Builder.Default
    private String paymentStatus = "UNPAID";

    /** Set when the order is created from Telegram so payment/cancel notifies can reply. */
    @Column(name = "telegram_chat_id", length = 64)
    private String telegramChatId;
}
