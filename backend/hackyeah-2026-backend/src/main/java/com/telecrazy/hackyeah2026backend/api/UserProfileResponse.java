package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.SpokenLanguages;
import com.telecrazy.hackyeah2026backend.domain.UserRole;

import java.util.List;

public record UserProfileResponse(
        Long id,
        String displayName,
        UserRole role,
        boolean identityVerified,
        boolean specialNeeds,
        boolean shareSpecialNeeds,
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
                user.isShareSpecialNeeds(),
                user.getTrustScore(),
                user.getRatingCount(),
                user.getRatingAverage(),
                user.getCityPoints(),
                SpokenLanguages.sorted(user.getLanguages())
        );
    }
}
