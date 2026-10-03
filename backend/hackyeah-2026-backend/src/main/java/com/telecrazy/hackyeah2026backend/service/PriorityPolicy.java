package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.RequestClassification;

/**
 * Final priority of a help request (0 = special for medicine, 1 = most urgent, 3 = normal).
 */
public final class PriorityPolicy {

    private PriorityPolicy() {
    }

    /**
     * Requesters with special needs are bumped one level up, never above the most urgent level.
     * The special medicine priority is kept as is.
     */
    public static int finalPriority(int aiPriority, boolean requesterHasSpecialNeeds) {
        if (aiPriority == RequestClassification.SPECIAL) {
            return RequestClassification.SPECIAL;
        }
        int clamped = Math.clamp(aiPriority, RequestClassification.MOST_URGENT, RequestClassification.LEAST_URGENT);
        if (!requesterHasSpecialNeeds) {
            return clamped;
        }
        return Math.max(RequestClassification.MOST_URGENT, clamped - 1);
    }
}
