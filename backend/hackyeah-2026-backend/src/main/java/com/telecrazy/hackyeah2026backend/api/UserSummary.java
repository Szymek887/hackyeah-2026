package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.SpokenLanguages;

import java.util.List;

/**
 * @param ratingAverage average stars received, {@code null} when not rated yet
 * @param languages     ISO 639-1 codes, sorted
 */
public record UserSummary(
        Long id,
        String displayName,
        int trustScore,
        boolean identityVerified,
        Double ratingAverage,
        int ratingCount,
        List<String> languages
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
                user.getRatingCount(),
                SpokenLanguages.sorted(user.getLanguages())
        );
    }
}
