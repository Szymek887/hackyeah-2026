package com.telecrazy.hackyeah2026backend.domain;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
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

    /**
     * Sensitive (health data): the user is marked as having a disability. Derived state, kept in sync by
     * {@link #replaceDisabilities} and {@link #withdrawSpecialNeedsConsent}: {@code true} only while the
     * consent exists <em>and</em> at least one disability is declared. Used for the priority bump.
     */
    @Column(nullable = false)
    private boolean specialNeeds;

    /**
     * Consent to store and share the special needs. {@code null} = no consent; withdrawing deletes the row
     * ({@code orphanRemoval}).
     */
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "special_needs_consent_id", unique = true)
    @Setter(AccessLevel.NONE)
    private SpecialNeedsConsent specialNeedsConsent;

    /**
     * Declared kinds of disability. Kept only while the consent exists; shown only to the user and to the
     * volunteer whose help they accepted (see {@link #sharedDisabilities()}).
     */
    @ElementCollection
    @CollectionTable(name = "app_user_disabilities", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "disability", nullable = false)
    @BatchSize(size = 50)
    @Setter(AccessLevel.NONE)
    private Set<DisabilityType> disabilities = new HashSet<>();

    /**
     * Special needs in the user's own words, extending the disabilities (e.g. "Nie słyszę pukania –
     * proszę dzwonić na telefon"). Same rules: kept only while the consent exists, shown only to the user
     * and to the volunteer whose help they accepted. See {@link SpecialNeedNotes}.
     */
    @ElementCollection
    @CollectionTable(name = "app_user_special_need_notes", joinColumns = @JoinColumn(name = "user_id"))
    @OrderColumn(name = "position")
    @Column(name = "note", nullable = false, length = SpecialNeedNotes.MAX_LENGTH)
    @BatchSize(size = 50)
    @Setter(AccessLevel.NONE)
    private List<String> specialNeedNotes = new ArrayList<>();

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

    /** Special needs are not set here: they require the consent and declared disabilities. */
    public AppUser(String displayName, UserRole role, boolean identityVerified, int trustScore) {
        this.displayName = displayName;
        this.role = role;
        this.identityVerified = identityVerified;
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

    /**
     * Creates the consent record (if missing). Does not mark the user as disabled by itself – that happens
     * only once disabilities are declared, see {@link #replaceDisabilities}. Idempotent.
     */
    public void grantSpecialNeedsConsent(Instant now) {
        if (specialNeedsConsent == null) {
            specialNeedsConsent = new SpecialNeedsConsent(now);
        }
    }

    /**
     * Deletes the consent record and the special-needs information itself, incl. disabilities and notes.
     * Idempotent.
     */
    public void withdrawSpecialNeedsConsent() {
        specialNeedsConsent = null;
        specialNeeds = false;
        disabilities.clear();
        specialNeedNotes.clear();
    }

    /**
     * Replaces the special-need notes; they are normalized by {@link SpecialNeedNotes}. Allowed only while the
     * consent exists. Notes do not mark the user as disabled – only disabilities do.
     */
    public void replaceSpecialNeedNotes(Collection<String> notes) {
        if (!hasSpecialNeedsConsent()) {
            throw new IllegalStateException("Special needs can be stored only with special-needs consent");
        }
        List<String> normalized = SpecialNeedNotes.normalize(notes);
        specialNeedNotes.clear();
        specialNeedNotes.addAll(normalized);
    }

    /**
     * Replaces the declared disabilities and marks the user as disabled exactly when the list is not empty.
     * Allowed only while the consent exists – without it no disability information may be stored.
     */
    public void replaceDisabilities(Collection<DisabilityType> types) {
        if (!hasSpecialNeedsConsent()) {
            throw new IllegalStateException("Disabilities can be stored only with special-needs consent");
        }
        disabilities.clear();
        disabilities.addAll(types);
        specialNeeds = !disabilities.isEmpty();
    }

    public boolean hasSpecialNeedsConsent() {
        return specialNeedsConsent != null;
    }

    /**
     * What the accepted volunteer may learn: {@code true} only with special needs <em>and</em> a consent
     * record. {@code false} does not reveal which of the two is missing.
     */
    public boolean sharesSpecialNeeds() {
        return specialNeeds && hasSpecialNeedsConsent();
    }

    /**
     * Disabilities the accepted volunteer may see, sorted; empty unless {@link #sharesSpecialNeeds()}.
     * Callers must check that the viewer is allowed to see full request details.
     */
    public List<DisabilityType> sharedDisabilities() {
        return sharesSpecialNeeds() ? disabilities.stream().sorted().toList() : List.of();
    }

    /**
     * Special-need notes the accepted volunteer may see: shared whenever the consent exists, since the consent
     * covers publishing them. Callers must check that the viewer may see full request details.
     */
    public List<String> sharedSpecialNeedNotes() {
        return hasSpecialNeedsConsent() ? List.copyOf(specialNeedNotes) : List.of();
    }

    public void addRating(int stars) {
        ratingCount++;
        ratingTotal += stars;
    }
}
