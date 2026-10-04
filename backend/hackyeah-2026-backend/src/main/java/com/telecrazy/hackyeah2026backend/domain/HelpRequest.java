package com.telecrazy.hackyeah2026backend.domain;

import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.ColumnDefault;
import org.locationtech.jts.geom.Point;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(
        name = "help_requests",
        indexes = {
                @Index(name = "idx_help_requests_status", columnList = "status"),
                @Index(name = "idx_help_requests_category", columnList = "category")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class HelpRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private AppUser requester;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HelpCategory category;

    /** Final priority (1 = most urgent), after adjustments such as the requester's special needs. */
    @Column(nullable = false)
    private int priority;

    /** Priority suggested by the classifier, before adjustments. */
    private Integer aiPriority;

    @Enumerated(EnumType.STRING)
    private ClassificationSource classificationSource;

    @ElementCollection
    @BatchSize(size = 50)
    @CollectionTable(name = "help_request_tags", joinColumns = @JoinColumn(name = "help_request_id"))
    @Column(name = "tag", nullable = false, length = 60)
    private List<String> tags = new ArrayList<>();

    @ElementCollection
    @BatchSize(size = 50)
    @CollectionTable(name = "help_request_risk_flags", joinColumns = @JoinColumn(name = "help_request_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "risk_flag", nullable = false)
    private Set<RiskFlag> riskFlags = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HelpRequestStatus status;

    @Column(columnDefinition = "geometry(Point,4326)", nullable = false)
    private Point location;

    @Column(nullable = false)
    private String street;

    @Column(nullable = false)
    private String buildingNumber;

    private String apartmentNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "volunteer_id")
    private AppUser volunteer;

    /** Single-use QR token shown by the requester and scanned by the volunteer to complete the request. */
    @Column(length = 64)
    private String handoffToken;

    private Instant handoffTokenExpiresAt;

    private Instant handoffTokenUsedAt;

    /** City admin who approved or dismissed the request after the AI held it for review. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private AppUser reviewedBy;

    private Instant reviewedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant updatedAt;

    @Version
    @ColumnDefault("0")
    @Column(nullable = false)
    private long version;

    public HelpRequest(
            AppUser requester,
            String title,
            String description,
            HelpCategory category,
            int priority,
            Point location,
            String street,
            String buildingNumber,
            String apartmentNumber
    ) {
        this.requester = requester;
        this.title = title;
        this.description = description;
        this.category = category;
        this.priority = priority;
        this.status = HelpRequestStatus.OPEN;
        this.location = location;
        this.street = street;
        this.buildingNumber = buildingNumber;
        this.apartmentNumber = apartmentNumber;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }
}
