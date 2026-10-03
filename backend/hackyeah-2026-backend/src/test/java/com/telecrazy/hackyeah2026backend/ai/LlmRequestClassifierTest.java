package com.telecrazy.hackyeah2026backend.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.telecrazy.hackyeah2026backend.ai.LlmRequestClassifier.LlmOutput;
import com.telecrazy.hackyeah2026backend.request.RequestCategory;

class LlmRequestClassifierTest {

    @Test
    void normalizesValidOutput() {
        RequestClassification result = LlmRequestClassifier.normalize(
                new LlmOutput("basic_needs", 1, List.of(" Leki ", "apteka", "leki", ""), List.of("scam_suspected")));

        assertThat(result.category()).isEqualTo(RequestCategory.BASIC_NEEDS);
        assertThat(result.priority()).isEqualTo(1);
        assertThat(result.tags()).containsExactly("leki", "apteka");
        assertThat(result.riskFlags()).containsExactly(RiskFlag.SCAM_SUSPECTED);
        assertThat(result.source()).isEqualTo(ClassificationSource.LLM);
    }

    @Test
    void clampsPriorityAndDropsUnknownFlagsAndExtraTags() {
        RequestClassification result = LlmRequestClassifier.normalize(
                new LlmOutput("SOCIAL", 7, List.of("a", "b", "c", "d", "e", "f"), List.of("UNKNOWN")));

        assertThat(result.priority()).isEqualTo(3);
        assertThat(result.tags()).hasSize(LlmRequestClassifier.MAX_TAGS);
        assertThat(result.riskFlags()).isEmpty();
    }

    @Test
    void medicalEmergencyIsAlwaysMostUrgent() {
        RequestClassification result = LlmRequestClassifier.normalize(
                new LlmOutput("BASIC_NEEDS", 3, List.of(), List.of("MEDICAL_EMERGENCY")));

        assertThat(result.priority()).isEqualTo(1);
    }

    @Test
    void rejectsUnknownCategory() {
        assertThatThrownBy(() -> LlmRequestClassifier.normalize(new LlmOutput("PETS", 2, List.of(), List.of())))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
