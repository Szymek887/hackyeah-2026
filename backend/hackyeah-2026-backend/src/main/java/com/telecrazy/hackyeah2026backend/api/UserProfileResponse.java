package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.DisabilityType;
import com.telecrazy.hackyeah2026backend.domain.SpokenLanguages;
import com.telecrazy.hackyeah2026backend.domain.UserRole;

import java.time.Instant;
import java.util.List;

/**
 * @param specialNeeds                 marked as disabled: consent given and at least one disability declared
 * @param specialNeedsConsent          whether a consent record to store and share special needs exists
 * @param specialNeedsConsentGrantedAt when that consent was given, {@code null} without consent
 * @param disabilities                 declared kinds of disability (health data), sorted; only for the user
 *                                     themselves – always empty in the public {@code /api/users/demo}
 * @param specialNeedNotes             special needs in the user's own words, in their order; same visibility as
 *                                     {@code disabilities}
 */
public record UserProfileResponse(
        Long id,
        String displayName,
        UserRole role,
        boolean identityVerified,
        boolean specialNeeds,
        boolean specialNeedsConsent,
        Instant specialNeedsConsentGrantedAt,
        List<DisabilityType> disabilities,
        List<String> specialNeedNotes,
        int trustScore,
        int ratingCount,
        Double ratingAverage,
        int cityPoints,
        List<String> languages
) {

    /** The user's own profile ({@code /api/users/me}). */
    public static UserProfileResponse from(AppUser user) {
        return of(user, user.getDisabilities().stream().sorted().toList(), List.copyOf(user.getSpecialNeedNotes()));
    }

    /** Account on the public demo login list: no disability details or notes (health data). */
    public static UserProfileResponse forDemoList(AppUser user) {
        return of(user, List.of(), List.of());
    }

    private static UserProfileResponse of(
            AppUser user,
            List<DisabilityType> disabilities,
            List<String> specialNeedNotes
    ) {
        return new UserProfileResponse(
                user.getId(),
                user.getDisplayName(),
                user.getRole(),
                user.isIdentityVerified(),
                user.isSpecialNeeds(),
                user.hasSpecialNeedsConsent(),
                user.hasSpecialNeedsConsent() ? user.getSpecialNeedsConsent().getGrantedAt() : null,
                disabilities,
                specialNeedNotes,
                user.getTrustScore(),
                user.getRatingCount(),
                user.getRatingAverage(),
                user.getCityPoints(),
                SpokenLanguages.sorted(user.getLanguages())
        );
    }
}
