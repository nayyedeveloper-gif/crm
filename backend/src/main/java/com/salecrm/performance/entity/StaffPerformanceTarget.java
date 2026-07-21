package com.salecrm.performance.entity;

import com.salecrm.branch.entity.Branch;
import com.salecrm.common.entity.BaseEntity;
import com.salecrm.performance.AmountBucket;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "staff_performance_targets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffPerformanceTarget extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", foreignKey = @ForeignKey(name = "fk_perf_target_branch"))
    private Branch branch;

    /** Matches crm_history.created_by (staff display name). */
    @Column(name = "staff_key", nullable = false, length = 120)
    private String staffKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "bucket_code", nullable = false, length = 20)
    private AmountBucket bucketCode;

    @Column(name = "target_count", nullable = false)
    @Builder.Default
    private int targetCount = 0;
}
