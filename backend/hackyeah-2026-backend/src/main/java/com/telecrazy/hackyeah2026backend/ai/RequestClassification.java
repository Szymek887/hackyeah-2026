package com.telecrazy.hackyeah2026backend.ai;

import java.util.List;
import java.util.Set;

import com.telecrazy.hackyeah2026backend.request.RequestCategory;

/**
 * Result of classifying a help request.
 *
 * @param priority 1 = critical, 2 = high, 3 = normal
 */
public record RequestClassification(
        RequestCategory category,
        int priority,
        List<String> tags,
        Set<RiskFlag> riskFlags,
        ClassificationSource source
) {

    public static final int MOST_URGENT = 1;
    public static final int LEAST_URGENT = 3;

    public boolean scamSuspected() {
        return riskFlags.contains(RiskFlag.SCAM_SUSPECTED);
    }
}
