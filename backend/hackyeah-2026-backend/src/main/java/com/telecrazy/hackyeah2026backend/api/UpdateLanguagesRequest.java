package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.SpokenLanguages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body of {@code PUT /api/users/me/languages}. Replaces the whole list; codes are ISO 639-1 ({@code "pl"}).
 */
public record UpdateLanguagesRequest(
        @NotNull @Size(min = 1, max = SpokenLanguages.MAX_LANGUAGES) List<@NotBlank String> languages
) {
}
