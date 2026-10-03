package com.telecrazy.hackyeah2026backend.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.telecrazy.hackyeah2026backend.ai.LlmRequestClassifier.LlmOutput;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

class LlmRequestClassifierTest {

    @Test
    void normalizesValidOutput() {
        RequestClassification result = LlmRequestClassifier.normalize(
                new LlmOutput("medicine", 1, List.of(" Leki ", "apteka", "leki", ""), List.of("scam_suspected"), false));

        assertThat(result.category()).isEqualTo(HelpCategory.MEDICINE);
        assertThat(result.priority()).isEqualTo(1);
        assertThat(result.tags()).containsExactly("leki", "apteka");
        assertThat(result.riskFlags()).containsExactly(RiskFlag.SCAM_SUSPECTED);
        assertThat(result.source()).isEqualTo(ClassificationSource.LLM);
    }

    @Test
    void clampsPriorityAndDropsUnknownFlagsAndExtraTags() {
        RequestClassification result = LlmRequestClassifier.normalize(
                new LlmOutput("SOCIAL", 7, List.of("a", "b", "c", "d", "e", "f"), List.of("UNKNOWN"), false));

        assertThat(result.priority()).isEqualTo(3);
        assertThat(result.tags()).hasSize(LlmRequestClassifier.MAX_TAGS);
        assertThat(result.riskFlags()).isEmpty();
    }

    @Test
    void dropsTagsThatAreNotPolishWords() {
        RequestClassification result = LlmRequestClassifier.normalize(new LlmOutput("HOME_SUPPORT", 2, List.of(
                "naprawa  kranu", "tel. 600123456", "45010112345", "help!", "pomoc w domu teraz już", "кран",
                "a".repeat(31), "wniosek"), List.of(), false));

        assertThat(result.tags()).containsExactly("naprawa kranu", "wniosek");
    }

    @Test
    void medicalEmergencyIsAlwaysMostUrgent() {
        RequestClassification result = LlmRequestClassifier.normalize(
                new LlmOutput("MEDICINE", 3, List.of(), List.of("MEDICAL_EMERGENCY"), false));

        assertThat(result.priority()).isEqualTo(1);
    }

    @Test
    void anyMentionOfMedicationMakesItAMedicineRequest() {
        RequestClassification result = LlmRequestClassifier.normalize(
                new LlmOutput("GROCERIES", 2, List.of("zakupy"), List.of(), true));

        assertThat(result.category()).isEqualTo(HelpCategory.MEDICINE);
    }

    @Test
    void rejectsUnknownCategory() {
        assertThatThrownBy(() -> LlmRequestClassifier.normalize(new LlmOutput("PETS", 2, List.of(), List.of(), null)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
