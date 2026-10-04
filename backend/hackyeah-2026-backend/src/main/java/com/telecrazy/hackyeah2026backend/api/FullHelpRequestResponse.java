package com.telecrazy.hackyeah2026backend.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.domain.DisabilityType;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Full help request details: exact location and address. Only for the requester and,
 * after acceptance, the assigned volunteer.
 *
 * @param requesterSpecialNeeds  {@code true} only when the requester consented to share special needs and declared
 *                               at least one disability; {@code false} does not tell which of the two is missing.
 *                               Never present in public views.
 * @param requesterDisabilities  the requester's declared disabilities, sorted – only when
 *                               {@code requesterSpecialNeeds} is {@code true}, otherwise empty. Like the exact
 *                               address, the volunteer gets them only from {@code ACCEPTED} on.
 * @param requesterSpecialNeedNotes the requester's special needs in their own words – only while the
 *                               consent exists, otherwise empty. Same visibility as the disabilities.
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
        List<DisabilityType> requesterDisabilities,
        List<String> requesterSpecialNeedNotes,
        UserSummary volunteer,
        String requesterInstructions,
        String volunteerInstructions,
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
