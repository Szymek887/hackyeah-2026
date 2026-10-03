package com.telecrazy.hackyeah2026backend.domain;

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
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.ColumnDefault;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

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

    /** Sum of all stars received; the average is derived from it and {@link #ratingCount}. */
    @ColumnDefault("0")
    @Column(nullable = false)
    private int ratingTotal;

    /** Engagement points earned by volunteers for well-rated help. */
    @ColumnDefault("0")
    @Column(nullable = false)
    private int cityPoints;

    /** Lower-case ISO 639-1 codes of the languages the user speaks, see {@link SpokenLanguages}. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "app_user_languages", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "language_code", nullable = false, length = 2)
    @BatchSize(size = 50)
    @Setter(AccessLevel.NONE)
    private Set<String> languages = new HashSet<>();

    public AppUser(String displayName, UserRole role, boolean identityVerified, boolean specialNeeds, int trustScore) {
        this.displayName = displayName;
        this.role = role;
        this.identityVerified = identityVerified;
        this.specialNeeds = specialNeeds;
        this.trustScore = trustScore;
    }

    /** Average stars received, {@code null} when the user has not been rated yet. */
    public Double getRatingAverage() {
        return ratingCount == 0 ? null : (double) ratingTotal / ratingCount;
    }

    /** Replaces the spoken languages; codes are validated and normalized by {@link SpokenLanguages}. */
    public void replaceLanguages(Collection<String> codes) {
        Set<String> normalized = SpokenLanguages.normalize(codes);
        languages.clear();
        languages.addAll(normalized);
    }

    public void addRating(int stars) {
        ratingCount++;
        ratingTotal += stars;
    }
}
