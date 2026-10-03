package com.telecrazy.hackyeah2026backend.ai;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/**
 * Classifies help requests with a local LLM served by Ollama.
 * Output from the model is validated and normalized; anything outside the allowed values is rejected or clamped.
 */
@Component
public class LlmRequestClassifier {

    static final int MAX_TAGS = 5;
    static final int MAX_TAG_LENGTH = 30;

    /**
     * Up to three lowercase words of Polish letters. Rejects digits (which could leak phone or PESEL numbers),
     * punctuation and letters from other alphabets.
     */
    private static final Pattern VALID_TAG = Pattern.compile("[a-ząćęłńóśźż]+(?:[ -][a-ząćęłńóśźż]+){0,2}");

    private static final Map<String, Object> RESPONSE_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "category", Map.of("type", "string", "enum", names(HelpCategory.values())),
                    "priority", Map.of("type", "integer", "enum", List.of(1, 2, 3)),
                    "tags", Map.of("type", "array", "items", Map.of("type", "string")),
                    "riskFlags", Map.of("type", "array", "items",
                            Map.of("type", "string", "enum", names(RiskFlag.values()))),
                    "mentionsMedication", Map.of("type", "boolean")
            ),
            "required", List.of("category", "priority", "tags", "riskFlags", "mentionsMedication")
    );

    private final OllamaClient ollamaClient;
    private final JsonMapper jsonMapper;
    private final String systemPrompt;

    public LlmRequestClassifier(
            OllamaClient ollamaClient,
            JsonMapper jsonMapper,
            @Value("classpath:prompts/classify-request.txt") Resource systemPrompt
    ) {
        this.ollamaClient = ollamaClient;
        this.jsonMapper = jsonMapper;
        this.systemPrompt = read(systemPrompt);
    }

    public RequestClassification classify(ClassificationInput input) {
        String userMessage = "Title: " + input.title() + "\nDescription: " + input.description();
        String content = ollamaClient.chat(systemPrompt, userMessage, RESPONSE_SCHEMA);
        return normalize(jsonMapper.readValue(content, LlmOutput.class));
    }

    static RequestClassification normalize(LlmOutput output) {
        HelpCategory category = HelpCategory.valueOf(
                Objects.requireNonNull(output.category(), "category").trim().toUpperCase(Locale.ROOT));
        // Any mention of medication makes it a medicine request, so its text is redacted (MedicineRedaction).
        if (Boolean.TRUE.equals(output.mentionsMedication())) {
            category = HelpCategory.MEDICINE;
        }

        int priority = Math.clamp(
                Objects.requireNonNull(output.priority(), "priority"),
                RequestClassification.MOST_URGENT,
                RequestClassification.LEAST_URGENT);

        List<String> tags = output.tags() == null ? List.of() : output.tags().stream()
                .filter(Objects::nonNull)
                .map(tag -> tag.trim().replaceAll("\\s+", " ").toLowerCase(Locale.forLanguageTag("pl")))
                .filter(tag -> tag.length() <= MAX_TAG_LENGTH && VALID_TAG.matcher(tag).matches())
                .distinct()
                .limit(MAX_TAGS)
                .toList();

        Set<RiskFlag> riskFlags = EnumSet.noneOf(RiskFlag.class);
        if (output.riskFlags() != null) {
            for (String flag : output.riskFlags()) {
                Arrays.stream(RiskFlag.values())
                        .filter(known -> known.name().equalsIgnoreCase(flag == null ? "" : flag.trim()))
                        .findFirst()
                        .ifPresent(riskFlags::add);
            }
        }

        // An emergency is always the most urgent, whatever the model said.
        if (riskFlags.contains(RiskFlag.MEDICAL_EMERGENCY)) {
            priority = RequestClassification.MOST_URGENT;
        }

        return new RequestClassification(category, priority, tags, riskFlags, ClassificationSource.LLM);
    }

    private static List<String> names(Enum<?>[] values) {
        return Arrays.stream(values).map(Enum::name).toList();
    }

    private static String read(Resource resource) {
        try {
            return resource.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read prompt " + resource, e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record LlmOutput(
            String category,
            Integer priority,
            List<String> tags,
            List<String> riskFlags,
            Boolean mentionsMedication
    ) {
    }
}
