package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;

/**
 * Access to the city panel (analytics, moderation): city administrators only.
 */
public final class CityAdminPolicy {

    private CityAdminPolicy() {
    }

    /** @throws ForbiddenException (403) with {@code message} for any other role */
    public static void requireCityAdmin(AppUser user, String message) {
        if (user.getRole() != UserRole.CITY_ADMIN) {
            throw new ForbiddenException(message);
        }
    }
}
