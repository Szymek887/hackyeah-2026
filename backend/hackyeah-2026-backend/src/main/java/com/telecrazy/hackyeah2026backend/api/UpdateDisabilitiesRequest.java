package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.DisabilityType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body of {@code PUT /api/users/me/disabilities}. Replaces the whole list; at least one kind – removing all of
 * them means withdrawing the consent.
 */
public record UpdateDisabilitiesRequest(
        @NotNull @Size(min = 1, max = 6) List<@NotNull DisabilityType> disabilities
) {
}
