package com.telecrazy.hackyeah2026backend.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/help-requests/{id}/complete}: the token scanned from the requester's QR code.
 */
public record CompleteHelpRequestRequest(@NotBlank @Size(max = 100) String token) {
}
