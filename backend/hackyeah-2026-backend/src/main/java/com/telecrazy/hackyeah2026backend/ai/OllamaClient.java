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
 * Minimal client for the Ollama chat API.
 * Uses structured outputs: the {@code format} field takes a JSON schema the reply must follow.
 */
@Component
public class OllamaClient {

    private final RestClient restClient;
    private final AiProperties properties;

    public OllamaClient(@Qualifier("ollamaRestClient") RestClient restClient, AiProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    /**
     * @return the raw content of the model's reply (a JSON string matching {@code jsonSchema})
     */
    public String chat(String systemPrompt, String userMessage, Map<String, Object> jsonSchema) {
        ChatRequest request = new ChatRequest(
                properties.model(),
                List.of(new Message("system", systemPrompt), new Message("user", userMessage)),
                false,
                jsonSchema,
                Map.of("temperature", 0),
                properties.keepAlive()
        );

        ChatResponse response = restClient.post()
                .uri("/api/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ChatResponse.class);

        if (response == null || response.message() == null || response.message().content() == null) {
            throw new IllegalStateException("Empty response from Ollama");
        }
        return response.message().content();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Message(String role, String content) {
    }

    record ChatRequest(
            String model,
            List<Message> messages,
            boolean stream,
            Map<String, Object> format,
            Map<String, Object> options,
            @JsonProperty("keep_alive") String keepAlive
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(Message message) {
    }
}
