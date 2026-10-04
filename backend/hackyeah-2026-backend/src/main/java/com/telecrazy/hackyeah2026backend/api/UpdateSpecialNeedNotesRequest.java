package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.SpecialNeedNotes;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body of {@code PUT /api/users/me/special-need-notes}. Replaces the whole list; an empty list clears it.
 * Notes are trimmed, blank ones and duplicates dropped, the order kept.
 */
public record UpdateSpecialNeedNotesRequest(
        @NotNull
        @Size(max = SpecialNeedNotes.MAX_NOTES)
        List<@NotNull @Size(max = SpecialNeedNotes.MAX_LENGTH) String> notes
) {
}
