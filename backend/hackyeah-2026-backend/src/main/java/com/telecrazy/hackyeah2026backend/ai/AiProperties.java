package com.telecrazy.hackyeah2026backend.ai;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param enabled   when false, requests are always classified by the keyword fallback
 * @param baseUrl   Ollama server URL
 * @param model     Ollama model name, e.g. {@code qwen2.5:7b}
 * @param timeout   max time to wait for the model before falling back
 * @param keepAlive how long Ollama keeps the model loaded between calls
 */
@ConfigurationProperties("app.ai")
public record AiProperties(
        boolean enabled,
        String baseUrl,
        String model,
        Duration timeout,
        String keepAlive
) {
}
