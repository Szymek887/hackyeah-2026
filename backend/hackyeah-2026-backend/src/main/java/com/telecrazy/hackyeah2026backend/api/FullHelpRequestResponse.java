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
 *
 * @param requesterSpecialNeeds {@code true} only when the requester has special needs and consented to share it
 *                              with the assigned volunteer; {@code false} does not tell which of the two is missing.
 *                              Never present in public views.
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
        boolean requesterSpecialNeeds,
        UserSummary volunteer,
        Instant createdAt,
        Instant updatedAt,
        ViewerRole viewerRole
) implements HelpRequestView {

    @Override
    @JsonProperty
    public Visibility visibility() {
        return Visibility.FULL;
    }
}
