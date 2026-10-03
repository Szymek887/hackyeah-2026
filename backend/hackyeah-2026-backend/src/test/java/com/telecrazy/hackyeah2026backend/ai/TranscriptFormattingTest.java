package com.telecrazy.hackyeah2026backend.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import com.telecrazy.hackyeah2026backend.ai.LlmTranscriptFormatter.LlmOutput;

class TranscriptFormattingTest {

    private static final TranscriptInput INPUT = new TranscriptInput(
            "dzień dobry yyy chciałabym no żeby ktoś mi kupił chleb i mleko bo nie mogę wyjść z domu");

    private final LlmTranscriptFormatter llm = mock(LlmTranscriptFormatter.class);
    private final SimpleTranscriptFormatter simple = new SimpleTranscriptFormatter();

    @Test
    void normalizesLlmOutput() {
        FormattedRequest result = LlmTranscriptFormatter.normalize(INPUT, new LlmOutput(
                " „zakupy spożywcze.” ", "proszę o kupienie chleba i mleka.\n Nie mogę wyjść z domu."));

        assertThat(result.title()).isEqualTo("Zakupy spożywcze");
        assertThat(result.description()).isEqualTo("Proszę o kupienie chleba i mleka. Nie mogę wyjść z domu.");
        assertThat(result.source()).isEqualTo(ClassificationSource.LLM);
    }

    @Test
    void rejectsBlankLlmOutput() {
        assertThatThrownBy(() -> LlmTranscriptFormatter.normalize(INPUT, new LlmOutput("Zakupy", "  ")))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> LlmTranscriptFormatter.normalize(INPUT, new LlmOutput(null, "Chleb")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void dropsSentencesWithPhoneOrPeselNumbers() {
        FormattedRequest result = LlmTranscriptFormatter.normalize(INPUT, new LlmOutput("Zakupy",
                "Proszę o 2 litry mleka. Mój numer to 600 123 456. PESEL 45010112345! Nie mogę wyjść z domu."));

        assertThat(result.description()).isEqualTo("Proszę o 2 litry mleka. Nie mogę wyjść z domu.");
    }

    @Test
    void rejectsDescriptionMuchLongerThanTranscript() {
        String invented = "Potrzebuję chleba. ".repeat(20);

        assertThatThrownBy(() -> LlmTranscriptFormatter.normalize(INPUT, new LlmOutput("Zakupy", invented)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void fallbackDropsGreetingAndBuildsTitleFromFirstSentence() {
        FormattedRequest result = simple.format(new TranscriptInput(
                "Dzień dobry, cieknie mi kran w kuchni. Sama nie dam rady."));

        assertThat(result.title()).isEqualTo("Cieknie mi kran w kuchni");
        assertThat(result.description()).isEqualTo("Cieknie mi kran w kuchni. Sama nie dam rady.");
        assertThat(result.source()).isEqualTo(ClassificationSource.FALLBACK);
    }

    @Test
    void fallbackRemovesFillersAndRepeatedWords() {
        FormattedRequest result = simple.format(new TranscriptInput(
                "Halo, halo, yyy no więc chciałbym żeby żeby ktoś mi, wie pani, przyniósł eee ziemniaki"));

        assertThat(result.description()).isEqualTo("Więc chciałbym żeby ktoś mi, przyniósł ziemniaki");
    }

    @Test
    void fallbackShortensLongTitleAndDescription() {
        FormattedRequest result = simple.format(new TranscriptInput("raz dwa trzy cztery ".repeat(100)));

        assertThat(result.title()).isEqualTo("Raz dwa trzy cztery raz dwa trzy cztery…");
        assertThat(result.description()).hasSizeLessThanOrEqualTo(FormattedRequest.DESCRIPTION_MAX).endsWith("…");
    }

    @Test
    void usesLlmWhenItSucceeds() {
        FormattedRequest llmResult = new FormattedRequest("Zakupy", "Proszę o chleb i mleko.", ClassificationSource.LLM);
        when(llm.format(any())).thenReturn(llmResult);

        assertThat(service(true).format(INPUT)).isEqualTo(llmResult);
    }

    @Test
    void fallsBackWhenLlmFails() {
        when(llm.format(any())).thenThrow(new ResourceAccessException("Connection refused"));

        assertThat(service(true).format(INPUT).source()).isEqualTo(ClassificationSource.FALLBACK);
    }

    @Test
    void skipsLlmWhenDisabled() {
        assertThat(service(false).format(INPUT).source()).isEqualTo(ClassificationSource.FALLBACK);
        verifyNoInteractions(llm);
    }

    private TranscriptFormattingService service(boolean enabled) {
        AiProperties properties = new AiProperties(enabled, "http://localhost:11434", "test", Duration.ofSeconds(1), "1m");
        return new TranscriptFormattingService(properties, llm, simple);
    }
}
