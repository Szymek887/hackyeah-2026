package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.time.Instant;

public record PublicHelpRequestResponse(
        Long id,
        String title,
        HelpCategory category,
        int priority,
        HelpRequestStatus status,
        GeoJsonPoint approximateLocation,
        GeoJsonPolygon maskedArea,
        Instant createdAt
) {
}
