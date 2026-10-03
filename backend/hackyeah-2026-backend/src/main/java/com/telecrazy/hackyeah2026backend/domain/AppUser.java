package com.telecrazy.hackyeah2026backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(nullable = false)
    private boolean identityVerified;

    @Column(nullable = false)
    private boolean specialNeeds;

    @Column(nullable = false)
    private int trustScore;

    @ColumnDefault("0")
    @Column(nullable = false)
    private int ratingCount;

    public AppUser(String displayName, UserRole role, boolean identityVerified, boolean specialNeeds, int trustScore) {
        this.displayName = displayName;
        this.role = role;
        this.identityVerified = identityVerified;
        this.specialNeeds = specialNeeds;
        this.trustScore = trustScore;
    }
}
