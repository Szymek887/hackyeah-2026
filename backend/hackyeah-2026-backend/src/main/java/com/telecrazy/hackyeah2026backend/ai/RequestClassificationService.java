package com.telecrazy.hackyeah2026backend.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Entry point for classifying help requests: tries the LLM first and falls back to keyword rules
 * on any failure (Ollama down, timeout, invalid JSON, unknown category). Medicine requests are then
 * restricted by {@link MedicineRedaction}.
 */
@Service
public class RequestClassificationService {

    private static final Logger log = LoggerFactory.getLogger(RequestClassificationService.class);

    private final AiProperties properties;
    private final LlmRequestClassifier llmClassifier;
    private final KeywordRequestClassifier keywordClassifier;

    public RequestClassificationService(
            AiProperties properties,
            LlmRequestClassifier llmClassifier,
            KeywordRequestClassifier keywordClassifier
    ) {
        this.properties = properties;
        this.llmClassifier = llmClassifier;
        this.keywordClassifier = keywordClassifier;
    }

    public RequestClassification classify(ClassificationInput input) {
        return MedicineRedaction.apply(classifyWithFallback(input));
    }

    private RequestClassification classifyWithFallback(ClassificationInput input) {
        if (!properties.enabled()) {
            return keywordClassifier.classify(input);
        }
        try {
            return llmClassifier.classify(input);
        } catch (RuntimeException e) {
            log.warn("LLM classification failed, using keyword fallback: {}", e.toString());
            return keywordClassifier.classify(input);
        }
    }
}
