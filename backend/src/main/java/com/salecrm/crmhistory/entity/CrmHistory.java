package com.salecrm.crmhistory.entity;

import com.salecrm.branch.entity.Branch;
import com.salecrm.common.entity.BaseEntity;
import com.salecrm.location.entity.Region;
import com.salecrm.location.entity.Township;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A single customer history record ("CRM History").
 *
 * Indexed for the concurrent, multi-branch access patterns:
 *  - branch scoping (branch_id)
 *  - free-text search on phone / customer name
 *  - default ordering by created_at
 */
@Entity
@Table(name = "crm_history", indexes = {
        @Index(name = "idx_crm_branch", columnList = "branch_id"),
        @Index(name = "idx_crm_phone", columnList = "phone"),
        @Index(name = "idx_crm_customer_name", columnList = "customer_name"),
        @Index(name = "idx_crm_created_at", columnList = "created_at"),
        @Index(name = "idx_crm_branch_created", columnList = "branch_id,created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrmHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false, foreignKey = @ForeignKey(name = "fk_crm_branch"))
    private Branch branch;

    @Column(name = "customer_name", nullable = false, length = 160)
    private String customerName;

    @Column(name = "phone", nullable = false, length = 40)
    private String phone;

    @Column(name = "birthday")
    private LocalDate birthday;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 20)
    @Builder.Default
    private ActionType actionType = ActionType.PURCHASE;

    /** Legacy Laravel invite_status (attend / not_attend / …). */
    @Enumerated(EnumType.STRING)
    @Column(name = "invite_status", length = 40)
    private InviteStatus inviteStatus;

    @Column(name = "customer_condition", length = 120)
    private String customerCondition;

    /** Source id from Laravel {@code crm_histories.id} for idempotent import. */
    @Column(name = "legacy_id")
    private Long legacyId;

    /** Source legacy users.id from Laravel {@code crm_histories.created_by}. */
    @Column(name = "legacy_created_by_user_id")
    private Long legacyCreatedByUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id", foreignKey = @ForeignKey(name = "fk_crm_region"))
    private Region region;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "township_id", foreignKey = @ForeignKey(name = "fk_crm_township"))
    private Township township;

    @Column(name = "nrc", length = 30)
    private String nrc;

    @Column(name = "address", length = 400)
    private String address;

    @Column(name = "remark", length = 1000)
    private String remark;
}
