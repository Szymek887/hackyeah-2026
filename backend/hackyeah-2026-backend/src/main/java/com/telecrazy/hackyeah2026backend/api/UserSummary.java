package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.AppUser;

public record UserSummary(Long id, String displayName, int trustScore, boolean identityVerified) {

    public static UserSummary from(AppUser user) {
        if (user == null) {
            return null;
        }
        return new UserSummary(user.getId(), user.getDisplayName(), user.getTrustScore(), user.isIdentityVerified());
    }
}
