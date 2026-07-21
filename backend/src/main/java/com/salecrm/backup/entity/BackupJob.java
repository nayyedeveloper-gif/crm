package com.salecrm.backup.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "backup_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupJob extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_type", nullable = false, length = 20)
    private String jobType;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "filename", length = 260)
    private String filename;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "record_count")
    private Integer recordCount;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "triggered_by", length = 120)
    private String triggeredBy;

    @Column(name = "destination_type", length = 30)
    private String destinationType;

    @Column(name = "destination_path", length = 500)
    private String destinationPath;
}
