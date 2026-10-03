package com.telecrazy.hackyeah2026backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Record of a user's consent to store their special needs (disability, GDPR art. 9 health data) and
 * share the fact with the volunteer whose help they accepted. The row exists only while the consent
 * is in force: withdrawing it deletes the row (see {@link AppUser#withdrawSpecialNeedsConsent()}).
 */
@Entity
@Table(name = "special_needs_consents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SpecialNeedsConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Instant grantedAt;

    SpecialNeedsConsent(Instant grantedAt) {
        this.grantedAt = grantedAt;
    }
}
