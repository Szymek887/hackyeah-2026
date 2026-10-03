package com.telecrazy.hackyeah2026backend.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

/**
 * Body of {@code POST /api/help-requests}. Category may be user-picked; priority and tags are server-side.
 */
public record CreateHelpRequestRequest(
        @Size(max = 120) String title,
        @Size(max = 1000) String description,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
        @Size(max = 255) String street,
        @Size(max = 20) String buildingNumber,
        @Size(max = 20) String apartmentNumber,
        HelpCategory category
) {
}
