package com.telecrazy.hackyeah2026backend.service;

/**
 * How a rating changes the rated user's reputation.
 */
public final class ReputationPolicy {

    /** Share of the new rating in the trust score; the rest is the score so far. */
    static final double NEW_RATING_WEIGHT = 0.2;

    private static final int MIN_TRUST_SCORE = 0;
    private static final int MAX_TRUST_SCORE = 100;
    private static final int MIN_STARS_FOR_POINTS = 4;
    private static final int POINTS_PER_STAR = 5;

    private ReputationPolicy() {
    }

    /**
     * Moves the trust score 20% towards the rating mapped to 0–100 (1 star = 0, 5 stars = 100).
     * A moving average keeps seeded scores meaningful and a single rating never swings the score
     * to an extreme.
     */
    public static int updatedTrustScore(int currentTrustScore, int stars) {
        int ratingScore = (stars - 1) * (MAX_TRUST_SCORE / 4);
        long updated = Math.round(currentTrustScore + (ratingScore - currentTrustScore) * NEW_RATING_WEIGHT);
        return Math.clamp(updated, MIN_TRUST_SCORE, MAX_TRUST_SCORE);
    }

    /**
     * City engagement points for a volunteer rated by the requester: 20 for 4 stars, 25 for 5 stars,
     * none below that.
     */
    public static int volunteerCityPoints(int stars) {
        return stars >= MIN_STARS_FOR_POINTS ? stars * POINTS_PER_STAR : 0;
    }
}
