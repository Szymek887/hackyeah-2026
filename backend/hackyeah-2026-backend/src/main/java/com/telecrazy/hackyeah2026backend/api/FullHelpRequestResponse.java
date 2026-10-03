package com.telecrazy.hackyeah2026backend.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Full help request details: exact location and address. Only for the requester and,
 * after acceptance, the assigned volunteer.
 */
public record FullHelpRequestResponse(
        Long id,
        String title,
        String description,
        HelpCategory category,
        int priority,
        Integer aiPriority,
        HelpRequestStatus status,
        List<String> tags,
        Set<RiskFlag> riskFlags,
        ClassificationSource classificationSource,
        GeoJsonPoint location,
        String street,
        String buildingNumber,
        String apartmentNumber,
        UserSummary requester,
        UserSummary volunteer,
        Instant createdAt,
        Instant updatedAt
) implements HelpRequestView {

    @Override
    @JsonProperty
    public Visibility visibility() {
        return Visibility.FULL;
    }
}
