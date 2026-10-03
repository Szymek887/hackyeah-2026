package com.telecrazy.hackyeah2026backend.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import com.telecrazy.hackyeah2026backend.request.RequestCategory;

class RequestClassificationServiceTest {

    private static final ClassificationInput INPUT =
            new ClassificationInput("Leki", "Skończyły mi się leki na serce, nie mam jak wyjść.");

    private final LlmRequestClassifier llm = mock(LlmRequestClassifier.class);
    private final KeywordRequestClassifier keywords = new KeywordRequestClassifier();

    @Test
    void usesLlmWhenItSucceeds() {
        RequestClassification llmResult = new RequestClassification(
                RequestCategory.BASIC_NEEDS, 1, List.of("leki"), Set.of(), ClassificationSource.LLM);
        when(llm.classify(any())).thenReturn(llmResult);

        assertThat(service(true).classify(INPUT)).isEqualTo(llmResult);
    }

    @Test
    void fallsBackWhenLlmFails() {
        when(llm.classify(any())).thenThrow(new ResourceAccessException("Connection refused"));

        assertThat(service(true).classify(INPUT).source()).isEqualTo(ClassificationSource.FALLBACK);
    }

    @Test
    void skipsLlmWhenDisabled() {
        assertThat(service(false).classify(INPUT).source()).isEqualTo(ClassificationSource.FALLBACK);
        verifyNoInteractions(llm);
    }

    private RequestClassificationService service(boolean enabled) {
        AiProperties properties = new AiProperties(
                enabled, "http://localhost:11434", "qwen2.5:7b", Duration.ofSeconds(1), "30m");
        return new RequestClassificationService(properties, llm, keywords);
    }
}
