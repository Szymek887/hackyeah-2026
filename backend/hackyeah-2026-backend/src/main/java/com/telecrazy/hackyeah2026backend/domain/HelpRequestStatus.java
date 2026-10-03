package com.telecrazy.hackyeah2026backend.domain;

public enum HelpRequestStatus {
    OPEN,
    OFFERED,
    ACCEPTED,
    COMPLETED,
    CANCELLED,
    RATED,
    /** Flagged by AI as a suspected scam; hidden from public lists until manually reviewed. */
    UNDER_REVIEW
}
