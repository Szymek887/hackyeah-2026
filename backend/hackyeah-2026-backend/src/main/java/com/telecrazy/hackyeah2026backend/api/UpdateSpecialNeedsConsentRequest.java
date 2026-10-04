package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.DisabilityType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body of {@code PUT /api/users/me/special-needs-consent} (switch on the profile).
 *
 * @param consent      {@code true} gives the consent to store and share the special needs; {@code false}
 *                     withdraws it and deletes all special-needs information
 * @param disabilities required with {@code consent: true}: at least one kind – the consent is given for them;
 *                     ignored with {@code false}
 */
public record UpdateSpecialNeedsConsentRequest(
        @NotNull Boolean consent,
        @Size(max = 6) List<@NotNull DisabilityType> disabilities
) {
}
