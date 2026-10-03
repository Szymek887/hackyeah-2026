package com.telecrazy.hackyeah2026backend.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.time.Instant;
import java.util.List;

/**
 * Public help request details: masked area only, no address, exact location or requester identity.
 * {@code description} is {@code null} when the classifier detected personal data in it.
 */
public record PublicHelpRequestDetailsResponse(
        Long id,
        String title,
        String description,
        HelpCategory category,
        int priority,
        HelpRequestStatus status,
        List<String> tags,
        GeoJsonPoint approximateLocation,
        GeoJsonPolygon maskedArea,
        Instant createdAt
) implements HelpRequestView {

    @Override
    @JsonProperty
    public Visibility visibility() {
        return Visibility.PUBLIC;
    }
}
