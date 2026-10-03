package com.telecrazy.hackyeah2026backend.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/help-requests/{id}/ratings}. The rated user is the other side of the request.
 */
public record CreateRatingRequest(
        @NotNull @Min(1) @Max(5) Integer stars,
        @Size(max = 500) String comment
) {
}
