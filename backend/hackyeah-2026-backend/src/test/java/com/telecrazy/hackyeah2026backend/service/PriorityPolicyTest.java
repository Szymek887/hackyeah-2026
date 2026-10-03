package com.telecrazy.hackyeah2026backend.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class PriorityPolicyTest {

    @ParameterizedTest(name = "ai={0}, specialNeeds={1} -> {2}")
    @CsvSource({
            "1, false, 1",
            "2, false, 2",
            "3, false, 3",
            "1, true, 1",
            "2, true, 1",
            "3, true, 2",
            "0, false, 0",
            "0, true, 0",
            "-1, false, 1",
            "7, false, 3",
            "7, true, 2"
    })
    void bumpsPriorityForSpecialNeedsWithinAllowedRange(int aiPriority, boolean specialNeeds, int expected) {
        assertThat(PriorityPolicy.finalPriority(aiPriority, specialNeeds)).isEqualTo(expected);
    }
}
