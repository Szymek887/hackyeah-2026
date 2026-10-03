package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.AppUser;

/**
 * @param ratingAverage average stars received, {@code null} when not rated yet
 */
public record UserSummary(
        Long id,
        String displayName,
        int trustScore,
        boolean identityVerified,
        Double ratingAverage,
        int ratingCount
) {

    public static UserSummary from(AppUser user) {
        if (user == null) {
            return null;
        }
        return new UserSummary(
                user.getId(),
                user.getDisplayName(),
                user.getTrustScore(),
                user.isIdentityVerified(),
                user.getRatingAverage(),
                user.getRatingCount()
        );
    }
}
