package com.telecrazy.hackyeah2026backend.api;

import java.time.Instant;

/**
 * QR handoff token of an accepted request. The QR code encodes {@code token} as is.
 */
public record HandoffTokenResponse(Long requestId, String token, Instant expiresAt) {
}
