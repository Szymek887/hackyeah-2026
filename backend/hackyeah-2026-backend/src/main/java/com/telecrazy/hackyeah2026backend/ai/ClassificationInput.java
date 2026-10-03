package com.telecrazy.hackyeah2026backend.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClassificationInput(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String description
) {
}
