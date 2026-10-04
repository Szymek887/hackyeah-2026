package com.telecrazy.hackyeah2026backend.ai;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param enabled when false, requests are always classified by the keyword fallback
 * @param baseUrl OpenRouter API URL
 * @param apiKey  OpenRouter API key; never commit it, see {@code secrets.properties.example}
 * @param models  OpenRouter model ids in order of preference; later ones are used when the first is
 *                rate-limited or down, e.g. {@code google/gemma-4-31b-it:free}
 * @param timeout max time to wait for the model before falling back
 */
@ConfigurationProperties("app.ai")
public record AiProperties(
        boolean enabled,
        String baseUrl,
        String apiKey,
        List<String> models,
        Duration timeout
) {
}
