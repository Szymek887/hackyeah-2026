package com.telecrazy.hackyeah2026backend.ai;

/**
 * Title and description written from a dictated request, ready to prefill the request form.
 * Both fit the limits of {@code CreateHelpRequestRequest}.
 */
public record FormattedRequest(
        String title,
        String description,
        ClassificationSource source
) {

    public static final int TITLE_MAX = 120;
    public static final int DESCRIPTION_MAX = 1000;
}
