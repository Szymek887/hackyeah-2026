package com.telecrazy.hackyeah2026backend.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/help-requests}. Category, priority and tags come from the AI classifier.
 */
public record CreateHelpRequestRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 1000) String description,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
        @NotBlank @Size(max = 255) String street,
        @NotBlank @Size(max = 20) String buildingNumber,
        @Size(max = 20) String apartmentNumber
) {
}
