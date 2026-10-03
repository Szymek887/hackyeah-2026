package com.telecrazy.hackyeah2026backend.domain;

import jakarta.persistence.Column;
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
import org.hibernate.annotations.ColumnDefault;
import org.locationtech.jts.geom.Point;

import java.time.Instant;

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

    @Column(nullable = false)
    private int priority;

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
