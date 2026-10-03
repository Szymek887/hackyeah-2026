package com.telecrazy.hackyeah2026backend.api;

import jakarta.validation.constraints.NotNull;

/**
 * Body of {@code PUT /api/users/me/special-needs-consent} (checkbox / switch on the profile).
 *
 * @param shareWithVolunteer whether the volunteer whose offer the user accepted may learn about the special needs
 */
public record UpdateSpecialNeedsConsentRequest(@NotNull Boolean shareWithVolunteer) {
}
