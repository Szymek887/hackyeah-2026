package com.telecrazy.hackyeah2026backend.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param transcript raw speech-to-text output of a dictated request
 */
public record TranscriptInput(
        @NotBlank @Size(max = 4000) String transcript
) {
}
