package com.telecrazy.hackyeah2026backend.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Runs one sample classification and one transcript formatting in the background once the app has started.
 * This loads the model and lets Ollama cache both system prompts, so the first real calls are as fast as later ones.
 * Failures are only logged: classification still falls back to keyword rules if Ollama is down.
 */
@Component
class OllamaWarmUp {

    private static final Logger log = LoggerFactory.getLogger(OllamaWarmUp.class);

    private static final ClassificationInput SAMPLE =
            new ClassificationInput("Zakupy", "Potrzebuję chleba i mleka ze sklepu.");
    private static final TranscriptInput SAMPLE_TRANSCRIPT =
            new TranscriptInput("dzień dobry yyy potrzebuję chleba i mleka ze sklepu");

    private final AiProperties properties;
    private final LlmRequestClassifier llmClassifier;
    private final LlmTranscriptFormatter llmFormatter;

    OllamaWarmUp(AiProperties properties, LlmRequestClassifier llmClassifier, LlmTranscriptFormatter llmFormatter) {
        this.properties = properties;
        this.llmClassifier = llmClassifier;
        this.llmFormatter = llmFormatter;
    }

    @EventListener(ApplicationReadyEvent.class)
    void warmUp() {
        if (!properties.enabled()) {
            return;
        }
        Thread.ofVirtual().name("ollama-warm-up").start(() -> {
            long start = System.nanoTime();
            try {
                llmClassifier.classify(SAMPLE);
                llmFormatter.format(SAMPLE_TRANSCRIPT);
                log.info("Model {} warmed up in {} ms", properties.model(), (System.nanoTime() - start) / 1_000_000);
            } catch (RuntimeException e) {
                log.warn("Could not load model {}, keyword fallback will be used until Ollama is available: {}",
                        properties.model(), e.toString());
            }
        });
    }
}
