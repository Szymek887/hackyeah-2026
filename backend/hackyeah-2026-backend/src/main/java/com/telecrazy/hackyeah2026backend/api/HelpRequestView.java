package com.telecrazy.hackyeah2026backend.api;

/**
 * Response of {@code GET /api/help-requests/{id}}: either the full or the public (masked) variant,
 * distinguished by the {@code visibility} field.
 */
public sealed interface HelpRequestView permits FullHelpRequestResponse, PublicHelpRequestDetailsResponse {

    Visibility visibility();

    enum Visibility {
        FULL,
        PUBLIC
    }
}
