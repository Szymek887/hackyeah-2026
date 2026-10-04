package com.telecrazy.hackyeah2026backend.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Entry point for formatting dictated requests: tries the LLM first and falls back to
 * {@link SimpleTranscriptFormatter} on any failure (OpenRouter down or rate-limited, timeout, invalid output).
 */
@Service
public class TranscriptFormattingService {

    private static final Logger log = LoggerFactory.getLogger(TranscriptFormattingService.class);

    private final AiProperties properties;
    private final LlmTranscriptFormatter llmFormatter;
    private final SimpleTranscriptFormatter simpleFormatter;

    public TranscriptFormattingService(
            AiProperties properties,
            LlmTranscriptFormatter llmFormatter,
            SimpleTranscriptFormatter simpleFormatter
    ) {
        this.properties = properties;
        this.llmFormatter = llmFormatter;
        this.simpleFormatter = simpleFormatter;
    }

    public FormattedRequest format(TranscriptInput input) {
        if (!properties.enabled()) {
            return simpleFormatter.format(input);
        }
        try {
            return llmFormatter.format(input);
        } catch (RuntimeException e) {
            log.warn("LLM transcript formatting failed, using simple fallback: {}", e.toString());
            return simpleFormatter.format(input);
        }
    }
}
