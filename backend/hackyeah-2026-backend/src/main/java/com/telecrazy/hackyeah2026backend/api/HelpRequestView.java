package com.telecrazy.hackyeah2026backend.api;

/**
 * Response of {@code GET /api/help-requests/{id}}: either the full or the public (masked) variant,
 * distinguished by the {@code visibility} field.
 */
public sealed interface HelpRequestView permits FullHelpRequestResponse, PublicHelpRequestDetailsResponse {

    Visibility visibility();

    ViewerRole viewerRole();

    enum Visibility {
        FULL,
        PUBLIC
    }

    /** The caller's part in the request, so clients do not have to compare ids (PUBLIC has none). */
    enum ViewerRole {
        REQUESTER,
        /** The volunteer who offered help or was accepted. */
        VOLUNTEER,
        NONE
    }
}
