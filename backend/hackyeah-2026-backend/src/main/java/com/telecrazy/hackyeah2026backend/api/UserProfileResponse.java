package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.SpokenLanguages;
import com.telecrazy.hackyeah2026backend.domain.UserRole;

import java.time.Instant;
import java.util.List;

/**
 * @param specialNeedsConsent          whether a consent record to store and share special needs exists
 * @param specialNeedsConsentGrantedAt when that consent was given, {@code null} without consent
 */
public record UserProfileResponse(
        Long id,
        String displayName,
        UserRole role,
        boolean identityVerified,
        boolean specialNeeds,
        boolean specialNeedsConsent,
        Instant specialNeedsConsentGrantedAt,
        int trustScore,
        int ratingCount,
        Double ratingAverage,
        int cityPoints,
        List<String> languages
) {

    public static UserProfileResponse from(AppUser user) {
        return new UserProfileResponse(
                user.getId(),
                user.getDisplayName(),
                user.getRole(),
                user.isIdentityVerified(),
                user.isSpecialNeeds(),
                user.hasSpecialNeedsConsent(),
                user.hasSpecialNeedsConsent() ? user.getSpecialNeedsConsent().getGrantedAt() : null,
                user.getTrustScore(),
                user.getRatingCount(),
                user.getRatingAverage(),
                user.getCityPoints(),
                SpokenLanguages.sorted(user.getLanguages())
        );
    }
}
