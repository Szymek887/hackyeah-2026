package com.telecrazy.hackyeah2026backend.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class ReputationPolicyTest {

    @ParameterizedTest(name = "trust={0}, stars={1} -> {2}")
    @CsvSource({
            "50, 5, 60",
            "72, 5, 78",
            "80, 1, 64",
            "50, 3, 50",
            "100, 5, 100",
            "0, 1, 0",
            "90, 4, 87"
    })
    void movesTrustScoreTowardsRating(int trustScore, int stars, int expected) {
        assertThat(ReputationPolicy.updatedTrustScore(trustScore, stars)).isEqualTo(expected);
    }

    @ParameterizedTest(name = "stars={0} -> {1} points")
    @CsvSource({"1, 0", "2, 0", "3, 0", "4, 20", "5, 25"})
    void awardsCityPointsOnlyForGoodRatings(int stars, int expected) {
        assertThat(ReputationPolicy.volunteerCityPoints(stars)).isEqualTo(expected);
    }
}
