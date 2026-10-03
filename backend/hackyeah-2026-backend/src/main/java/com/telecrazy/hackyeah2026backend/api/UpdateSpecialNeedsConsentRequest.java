package com.telecrazy.hackyeah2026backend.api;

import jakarta.validation.constraints.NotNull;

/**
 * Body of {@code PUT /api/users/me/special-needs-consent} (switch on the profile).
 *
 * @param consent {@code true} grants the consent to store and share the special needs (creates the consent
 *                record and stores the special needs); {@code false} withdraws it (deletes both)
 */
public record UpdateSpecialNeedsConsentRequest(@NotNull Boolean consent) {
}
