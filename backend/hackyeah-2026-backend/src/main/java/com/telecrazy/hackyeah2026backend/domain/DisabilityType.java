package com.telecrazy.hackyeah2026backend.domain;

/**
 * Kinds of disability a requester may declare (health data, GDPR art. 9) – stored only with a
 * {@link SpecialNeedsConsent}. Same values as the frontend's {@code DisabilityType}.
 */
public enum DisabilityType {
    VISION,
    HEARING,
    MOBILITY,
    COGNITIVE,
    CHRONIC,
    OTHER
}
