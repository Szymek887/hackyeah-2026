package com.telecrazy.hackyeah2026backend.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.telecrazy.hackyeah2026backend.request.RequestCategory;

class KeywordRequestClassifierTest {

    private final KeywordRequestClassifier classifier = new KeywordRequestClassifier();

    @Test
    void demoScenarioIsCriticalBasicNeed() {
        RequestClassification result = classify("Potrzebuję leków",
                "Skończyły mi się leki na serce, nie mam jak wyjść z domu.");

        assertThat(result.category()).isEqualTo(RequestCategory.BASIC_NEEDS);
        assertThat(result.priority()).isEqualTo(1);
        assertThat(result.tags()).contains("leki");
        assertThat(result.source()).isEqualTo(ClassificationSource.FALLBACK);
    }

    @Test
    void ladderIsEquipmentLoan() {
        RequestClassification result = classify("Drabina", "Czy ktoś może pożyczyć drabinę na weekend?");

        assertThat(result.category()).isEqualTo(RequestCategory.EQUIPMENT_LOAN);
        assertThat(result.priority()).isEqualTo(3);
    }

    @Test
    void leakingTapIsHighPriorityHomeSupport() {
        RequestClassification result = classify("Kran", "W kuchni cieknie kran, potrzebuję pomocy z naprawą.");

        assertThat(result.category()).isEqualTo(RequestCategory.HOME_SUPPORT);
        assertThat(result.priority()).isEqualTo(2);
    }

    @Test
    void walkIsSocial() {
        assertThat(classify("Spacer", "Chętnie pójdę z kimś na spacer.").category())
                .isEqualTo(RequestCategory.SOCIAL);
    }

    @Test
    void flagsScamAndEmergency() {
        assertThat(classify("Pilne", "Proszę o kod BLIK, oddam jutro.").riskFlags())
                .contains(RiskFlag.SCAM_SUSPECTED);
        assertThat(classify("Pomocy", "Mam ból w klatce piersiowej.").riskFlags())
                .contains(RiskFlag.MEDICAL_EMERGENCY);
    }

    private RequestClassification classify(String title, String description) {
        return classifier.classify(new ClassificationInput(title, description));
    }
}
