package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.RequestClassification;

/**
 * Final priority of a help request (1 = most urgent, 3 = normal).
 */
public final class PriorityPolicy {

    private PriorityPolicy() {
    }

    /**
     * Requesters with special needs are bumped one level up, never above the most urgent level.
     */
    public static int finalPriority(int aiPriority, boolean requesterHasSpecialNeeds) {
        int clamped = Math.clamp(aiPriority, RequestClassification.MOST_URGENT, RequestClassification.LEAST_URGENT);
        if (!requesterHasSpecialNeeds) {
            return clamped;
        }
        return Math.max(RequestClassification.MOST_URGENT, clamped - 1);
    }
}
