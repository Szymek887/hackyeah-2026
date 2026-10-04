package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * A help request as the city admin sees it when deciding whether the AI was right to hold it back.
 * Title and description are the original text (judging a scam needs it), but the location is the
 * same masked area volunteers see: the address is not needed for the decision.
 *
 * @param reviewedAt {@code null} while the request waits for a decision
 */
public record ModerationItem(
        Long id,
        String title,
        String description,
        HelpCategory category,
        int priority,
        HelpRequestStatus status,
        Set<RiskFlag> riskFlags,
        List<String> tags,
        ClassificationSource classificationSource,
        UserSummary requester,
        GeoJsonPoint approximateLocation,
        GeoJsonPolygon maskedArea,
        Instant createdAt,
        Instant reviewedAt
) {
}
