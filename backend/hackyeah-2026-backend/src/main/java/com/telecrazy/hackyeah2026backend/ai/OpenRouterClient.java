package com.telecrazy.hackyeah2026backend.ai;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Minimal client for the OpenRouter chat completions API (OpenAI-compatible).
 * Uses structured outputs: {@code response_format} takes a JSON schema the reply must follow.
 * The configured models are sent as a fallback list, so OpenRouter switches to the next one
 * when a free model is rate-limited or unavailable.
 */
@Component
public class OpenRouterClient {

    private final RestClient restClient;
    private final AiProperties properties;

    public OpenRouterClient(@Qualifier("openRouterRestClient") RestClient restClient, AiProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    /**
     * @return the raw content of the model's reply (a JSON string matching {@code jsonSchema})
     */
    public String chat(String systemPrompt, String userMessage, Map<String, Object> jsonSchema) {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new IllegalStateException("OpenRouter API key is not set (OPENROUTER_API_KEY)");
        }

        ChatRequest request = new ChatRequest(
                properties.models(),
                List.of(new Message("system", systemPrompt), new Message("user", userMessage)),
                false,
                new ResponseFormat("json_schema", new JsonSchema("response", true, jsonSchema)),
                0,
                // Thinking adds seconds of latency and is not needed for short classification tasks.
                Map.of("enabled", false),
                // Only route to providers that honour response_format, so the reply is valid JSON.
                Map.of("require_parameters", true)
        );

        ChatResponse response = restClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ChatResponse.class);

        if (response == null || response.choices() == null || response.choices().isEmpty()
                || response.choices().getFirst().message() == null
                || response.choices().getFirst().message().content() == null) {
            throw new IllegalStateException("Empty response from OpenRouter");
        }
        return stripCodeFence(response.choices().getFirst().message().content());
    }

    /** Some models wrap JSON in a Markdown code block even when asked for a schema. */
    static String stripCodeFence(String content) {
        return content.strip().replaceAll("^```(?:json)?\\s*|\\s*```$", "");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String role, String content) {
    }

    record JsonSchema(String name, boolean strict, Map<String, Object> schema) {
    }

    record ResponseFormat(String type, @JsonProperty("json_schema") JsonSchema jsonSchema) {
    }

    record ChatRequest(
            List<String> models,
            List<Message> messages,
            boolean stream,
            @JsonProperty("response_format") ResponseFormat responseFormat,
            double temperature,
            Map<String, Object> reasoning,
            Map<String, Object> provider
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Choice(Message message) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(List<Choice> choices) {
    }
}
