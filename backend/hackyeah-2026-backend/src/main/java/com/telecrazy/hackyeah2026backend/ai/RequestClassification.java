package com.telecrazy.hackyeah2026backend.ai;

import java.util.List;
import java.util.Set;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

/**
 * Result of classifying a help request.
 *
 * @param priority 0 = special (medicine, see {@link MedicineRedaction}), 1 = critical, 2 = high, 3 = normal
 */
public record RequestClassification(
        HelpCategory category,
        int priority,
        List<String> tags,
        Set<RiskFlag> riskFlags,
        ClassificationSource source
) {

    /** Medicine requests: details are given in person, see {@link MedicineRedaction}. */
    public static final int SPECIAL = 0;
    public static final int MOST_URGENT = 1;
    public static final int LEAST_URGENT = 3;

    public boolean scamSuspected() {
        return riskFlags.contains(RiskFlag.SCAM_SUSPECTED);
    }
}
