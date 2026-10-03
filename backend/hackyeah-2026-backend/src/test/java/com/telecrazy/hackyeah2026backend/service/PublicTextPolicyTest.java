package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PublicTextPolicyTest {

    @Test
    void keepsTextsWithoutPersonalData() {
        HelpRequest request = request(HelpCategory.GROCERIES, Set.of(RiskFlag.MEDICAL_EMERGENCY));

        assertThat(PublicTextPolicy.publicTitle(request)).isEqualTo("Zakupy dla Pana Jana, tel. 600100200");
        assertThat(PublicTextPolicy.publicDescription(request)).isEqualTo("Mieszkam przy Długiej 5/3.");
    }

    @ParameterizedTest
    @EnumSource(HelpCategory.class)
    void replacesTitleAndHidesDescriptionWithPersonalData(HelpCategory category) {
        HelpRequest request = request(category, Set.of(RiskFlag.PERSONAL_DATA));

        assertThat(PublicTextPolicy.publicTitle(request))
                .isEqualTo(PublicTextPolicy.genericTitle(category))
                .doesNotContain("600100200");
        assertThat(PublicTextPolicy.publicDescription(request)).isNull();
    }

    private static HelpRequest request(HelpCategory category, Set<RiskFlag> riskFlags) {
        HelpRequest request = new HelpRequest();
        request.setCategory(category);
        request.setTitle("Zakupy dla Pana Jana, tel. 600100200");
        request.setDescription("Mieszkam przy Długiej 5/3.");
        request.setRiskFlags(riskFlags);
        return request;
    }
}
