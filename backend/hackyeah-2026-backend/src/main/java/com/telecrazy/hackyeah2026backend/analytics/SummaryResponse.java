package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

import java.util.Map;

/**
 * Totals for the city dashboard. Every map contains all keys, with zero for missing values.
 *
 * @param open            requests waiting for a volunteer ({@code OPEN})
 * @param inProgress      requests being handled ({@code OFFERED}, {@code ACCEPTED})
 * @param fulfilled       requests where help was delivered ({@code COMPLETED}, {@code RATED})
 * @param cancelled       cancelled requests
 * @param fulfillmentRate {@code fulfilled / (total - cancelled)}, 0 when there is nothing to fulfil
 * @param byPriority      keys 1 (critical), 2 (high), 3 (normal)
 */
public record SummaryResponse(
        long total,
        long open,
        long inProgress,
        long fulfilled,
        long cancelled,
        double fulfillmentRate,
        Map<HelpRequestStatus, Long> byStatus,
        Map<HelpCategory, Long> byCategory,
        Map<Integer, Long> byPriority
) {
}
