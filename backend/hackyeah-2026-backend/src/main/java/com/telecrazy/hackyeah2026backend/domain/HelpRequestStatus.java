package com.telecrazy.hackyeah2026backend.domain;

import java.util.EnumSet;
import java.util.Set;

public enum HelpRequestStatus {
    OPEN,
    OFFERED,
    ACCEPTED,
    COMPLETED,
    CANCELLED,
    RATED,
    /** Flagged by AI as a suspected scam; hidden from public lists until manually reviewed. */
    UNDER_REVIEW;

    /** Statuses that never appear in public lists, details for non-authors or public aggregates. */
    public static final Set<HelpRequestStatus> HIDDEN_FROM_PUBLIC = EnumSet.of(UNDER_REVIEW);

    public boolean isHiddenFromPublic() {
        return HIDDEN_FROM_PUBLIC.contains(this);
    }
}
