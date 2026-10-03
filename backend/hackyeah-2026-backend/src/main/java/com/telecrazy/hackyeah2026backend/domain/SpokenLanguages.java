package com.telecrazy.hackyeah2026backend.domain;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Languages a user speaks, stored as lower-case ISO 639-1 codes ({@code "pl"}, {@code "uk"}, {@code "en"}).
 * The client translates codes to names, so no language list has to be kept in sync with the backend.
 */
public final class SpokenLanguages {

    public static final int MAX_LANGUAGES = 10;

    private static final Set<String> ISO_639_1 = Set.of(Locale.getISOLanguages());

    private SpokenLanguages() {
    }

    /**
     * Trims, lower-cases and de-duplicates the codes.
     *
     * @throws IllegalArgumentException when a code is not a known ISO 639-1 code or there are too many
     */
    public static Set<String> normalize(Collection<String> codes) {
        Set<String> normalized = new LinkedHashSet<>();
        for (String code : codes) {
            String candidate = code == null ? "" : code.trim().toLowerCase(Locale.ROOT);
            if (!ISO_639_1.contains(candidate)) {
                throw new IllegalArgumentException("Unknown language code: " + code);
            }
            normalized.add(candidate);
        }
        if (normalized.size() > MAX_LANGUAGES) {
            throw new IllegalArgumentException("At most " + MAX_LANGUAGES + " languages are allowed");
        }
        return normalized;
    }

    /** Stable order for responses. */
    public static List<String> sorted(Collection<String> codes) {
        return codes.stream().sorted().toList();
    }
}
