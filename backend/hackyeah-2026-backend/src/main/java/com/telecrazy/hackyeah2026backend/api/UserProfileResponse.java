package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.UserRole;

public record UserProfileResponse(
        Long id,
        String displayName,
        UserRole role,
        boolean identityVerified,
        boolean specialNeeds,
        int trustScore,
        int ratingCount,
        Double ratingAverage,
        int cityPoints
) {

    public static UserProfileResponse from(AppUser user) {
        return new UserProfileResponse(
                user.getId(),
                user.getDisplayName(),
                user.getRole(),
                user.isIdentityVerified(),
                user.isSpecialNeeds(),
                user.getTrustScore(),
                user.getRatingCount(),
                user.getRatingAverage(),
                user.getCityPoints()
        );
    }
}
