package com.telecrazy.hackyeah2026backend.domain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Special needs described in the user's own words (health data, stored only with a {@link SpecialNeedsConsent}),
 * e.g. "Nie słyszę pukania – proszę dzwonić na telefon". Kept in the order the user gave them.
 */
public final class SpecialNeedNotes {

    public static final int MAX_NOTES = 10;
    public static final int MAX_LENGTH = 200;

    private SpecialNeedNotes() {
    }

    /**
     * Trims the notes, drops blank ones and duplicates, keeps the order.
     *
     * @throws IllegalArgumentException when a note is too long or there are too many
     */
    public static List<String> normalize(Collection<String> notes) {
        Set<String> normalized = new LinkedHashSet<>();
        for (String note : notes) {
            String candidate = note == null ? "" : note.trim();
            if (candidate.isEmpty()) {
                continue;
            }
            if (candidate.length() > MAX_LENGTH) {
                throw new IllegalArgumentException("A special need may have at most " + MAX_LENGTH + " characters");
            }
            normalized.add(candidate);
        }
        if (normalized.size() > MAX_NOTES) {
            throw new IllegalArgumentException("At most " + MAX_NOTES + " special needs are allowed");
        }
        return new ArrayList<>(normalized);
    }
}
