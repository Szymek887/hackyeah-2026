package com.telecrazy.hackyeah2026backend.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

class KeywordRequestClassifierTest {

    private final KeywordRequestClassifier classifier = new KeywordRequestClassifier();

    @Test
    void demoScenarioIsCriticalMedicine() {
        RequestClassification result = classify("Potrzebuję leków",
                "Skończyły mi się leki na serce, nie mam jak wyjść z domu.");

        assertThat(result.category()).isEqualTo(HelpCategory.MEDICINE);
        assertThat(result.priority()).isEqualTo(1);
        assertThat(result.tags()).contains("leki");
        assertThat(result.source()).isEqualTo(ClassificationSource.FALLBACK);
    }

    @Test
    void shoppingIsGroceries() {
        RequestClassification result = classify("Zakupy", "Potrzebuję chleba i mleka ze sklepu.");

        assertThat(result.category()).isEqualTo(HelpCategory.GROCERIES);
        assertThat(result.tags()).contains("zakupy");
    }

    @Test
    void borrowingWinsOverRepairWords() {
        assertThat(classify("Drabina", "Pożyczy ktoś drabinę? Chcę wymienić żarówkę.").category())
                .isEqualTo(HelpCategory.EQUIPMENT_LOAN);
    }

    @Test
    void paperworkIsHomeSupport() {
        assertThat(classify("Pismo", "Pomoże ktoś wypełnić wniosek do urzędu?").category())
                .isEqualTo(HelpCategory.HOME_SUPPORT);
    }

    @Test
    void emergencyIsMedicineEvenWithoutMedicineWords() {
        RequestClassification result = classify("Źle się czuję", "Jest mi duszno, chętnie z kimś porozmawiam.");

        assertThat(result.category()).isEqualTo(HelpCategory.MEDICINE);
        assertThat(result.priority()).isEqualTo(1);
    }

    @Test
    void ladderIsEquipmentLoan() {
        RequestClassification result = classify("Drabina", "Czy ktoś może pożyczyć drabinę na weekend?");

        assertThat(result.category()).isEqualTo(HelpCategory.EQUIPMENT_LOAN);
        assertThat(result.priority()).isEqualTo(3);
    }

    @Test
    void leakingTapIsHighPriorityHomeSupport() {
        RequestClassification result = classify("Kran", "W kuchni cieknie kran, potrzebuję pomocy z naprawą.");

        assertThat(result.category()).isEqualTo(HelpCategory.HOME_SUPPORT);
        assertThat(result.priority()).isEqualTo(2);
    }

    @Test
    void walkIsSocial() {
        assertThat(classify("Spacer", "Chętnie pójdę z kimś na spacer.").category())
                .isEqualTo(HelpCategory.SOCIAL);
    }

    @Test
    void flagsScamAndEmergency() {
        assertThat(classify("Pilne", "Proszę o kod BLIK, oddam jutro.").riskFlags())
                .contains(RiskFlag.SCAM_SUSPECTED);
        assertThat(classify("Pomocy", "Mam ból w klatce piersiowej.").riskFlags())
                .contains(RiskFlag.MEDICAL_EMERGENCY);
    }

    @Test
    void spokenHealthProblemIsCriticalMedicine() {
        RequestClassification result = classify("Upadłam w łazience",
                "Upadłam w łazience i nie mogę wstać, bardzo boli mnie noga.");

        assertThat(result.category()).isEqualTo(HelpCategory.MEDICINE);
        assertThat(result.priority()).isEqualTo(1);
        assertThat(result.tags()).contains("zdrowie");
    }

    @Test
    void criticalHealthWinsOverShoppingWords() {
        RequestClassification result = classify("Proszę kupić lekarstwa",
                "Pilnie proszę kupić lekarstwa i chleb, mam gorączkę.");

        assertThat(result.category()).isEqualTo(HelpCategory.MEDICINE);
        assertThat(result.priority()).isEqualTo(1);
    }

    @Test
    void mostMatchingCategoryWins() {
        assertThat(classify("Zakupy", "Proszę kupić chleb, masło, jajka i jedną tabletkę.").category())
                .isEqualTo(HelpCategory.GROCERIES);
    }

    @Test
    void spokenChoresAreHomeSupport() {
        assertThat(classify("Śmieci", "Czy ktoś może wynieść śmieci i wyprowadzić psa?").category())
                .isEqualTo(HelpCategory.HOME_SUPPORT);
    }

    @Test
    void unmatchedRequestIsGeneralHomeSupportNotGroceries() {
        assertThat(classify("Pomocy", "Potrzebuję pomocy sąsiada.").category())
                .isEqualTo(HelpCategory.HOME_SUPPORT);
    }

    @Test
    void visitIsSocial() {
        assertThat(classify("Odwiedziny", "Jestem samotna, ktoś mógłby mnie odwiedzić?").category())
                .isEqualTo(HelpCategory.SOCIAL);
    }

    private RequestClassification classify(String title, String description) {
        return classifier.classify(new ClassificationInput(title, description));
    }
}
