package com.telecrazy.hackyeah2026backend.api;

import jakarta.validation.constraints.NotNull;

/**
 * Body of {@code PUT /api/users/me/special-needs-consent} (checkbox on the profile).
 *
 * @param consent {@code true} grants the consent to store and share disabilities (creates the consent record);
 *                {@code false} withdraws it (deletes the record, the disabilities and the special-needs marking)
 */
public record UpdateSpecialNeedsConsentRequest(@NotNull Boolean consent) {
}
