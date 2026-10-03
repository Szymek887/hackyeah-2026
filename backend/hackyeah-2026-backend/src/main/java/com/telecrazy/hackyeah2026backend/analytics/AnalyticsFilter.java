package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.time.Instant;
import java.util.Set;

/**
 * Optional filters shared by analytics queries. A {@code null} or empty value means "no filter".
 *
 * @param from inclusive lower bound on the request creation time
 * @param to   exclusive upper bound on the request creation time
 */
public record AnalyticsFilter(
        HelpCategory category,
        Set<HelpRequestStatus> statuses,
        Instant from,
        Instant to
) {

    public AnalyticsFilter {
        statuses = statuses == null ? Set.of() : Set.copyOf(statuses);
        if (from != null && to != null && !from.isBefore(to)) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }
    }
}
