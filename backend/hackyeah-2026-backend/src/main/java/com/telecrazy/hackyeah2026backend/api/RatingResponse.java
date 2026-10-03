package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;

/**
 * @param requestStatus     {@code RATED} once both sides rated, {@code COMPLETED} before that
 * @param ratedUser         the other side, with the updated trust score and rating average
 * @param cityPointsAwarded points the rated user earned with this rating (volunteers only)
 */
public record RatingResponse(HelpRequestStatus requestStatus, UserSummary ratedUser, int cityPointsAwarded) {
}
