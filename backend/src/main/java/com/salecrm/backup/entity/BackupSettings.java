package com.salecrm.backup.entity;

import com.salecrm.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "backup_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupSettings extends BaseEntity {

    @Id
    private Long id;

    @Column(name = "auto_enabled", nullable = false)
    @Builder.Default
    private boolean autoEnabled = false;

    @Column(name = "frequency", nullable = false, length = 20)
    @Builder.Default
    private String frequency = "DAILY";

    @Column(name = "time_of_day", nullable = false)
    @Builder.Default
    private LocalTime timeOfDay = LocalTime.of(2, 0);

    @Column(name = "retain_days", nullable = false)
    @Builder.Default
    private int retainDays = 30;

    @Column(name = "last_auto_run_at")
    private Instant lastAutoRunAt;

    /** LOCAL | GOOGLE_DRIVE | OTHER */
    @Column(name = "destination_type", nullable = false, length = 30)
    @Builder.Default
    private String destinationType = "LOCAL";

    @Column(name = "destination_path", nullable = false, length = 500)
    @Builder.Default
    private String destinationPath = "./data/backups";

    @Column(name = "drive_folder_id", length = 200)
    private String driveFolderId;
}
