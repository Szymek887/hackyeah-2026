package com.telecrazy.hackyeah2026backend.ai;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/**
 * Rewrites a dictated request (speech-to-text, often from seniors) into a short title and a clear description
 * with an LLM served by OpenRouter. Output is validated: a blank or suspiciously long reply is rejected,
 * so the caller falls back to {@link SimpleTranscriptFormatter}. Sentences the model left with a phone or PESEL
 * number are dropped, since the description is shown publicly.
 */
@Component
public class LlmTranscriptFormatter {

    /**
     * The description should be shorter than the transcript; a much longer one means the model added content.
     * Allows some slack for short transcripts, where punctuation and fixed words add relatively more.
     */
    static final double MAX_GROWTH = 1.5;
    static final int GROWTH_SLACK = 60;

    /** 7 or more digits, possibly split by spaces or dashes: a phone, PESEL or ID number. */
    private static final Pattern LONG_NUMBER = Pattern.compile("\\d(?:[ -]?\\d){6,}");
    private static final Pattern SENTENCE_END = Pattern.compile("(?<=[.!?])\\s+");

    private static final Map<String, Object> RESPONSE_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "title", Map.of("type", "string"),
                    "description", Map.of("type", "string")
            ),
            "required", List.of("title", "description"),
            "additionalProperties", false
    );

    private final OpenRouterClient openRouterClient;
    private final JsonMapper jsonMapper;
    private final String systemPrompt;

    public LlmTranscriptFormatter(
            OpenRouterClient openRouterClient,
            JsonMapper jsonMapper,
            @Value("classpath:prompts/format-transcript.txt") Resource systemPrompt
    ) {
        this.openRouterClient = openRouterClient;
        this.jsonMapper = jsonMapper;
        this.systemPrompt = read(systemPrompt);
    }

    public FormattedRequest format(TranscriptInput input) {
        String userMessage = "Transcript: " + input.transcript();
        String content = openRouterClient.chat(systemPrompt, userMessage, RESPONSE_SCHEMA);
        return normalize(input, jsonMapper.readValue(content, LlmOutput.class));
    }

    static FormattedRequest normalize(TranscriptInput input, LlmOutput output) {
        String title = stripTrailingPeriod(unquote(SimpleTranscriptFormatter.clean(output.title())));
        String description = withoutLongNumbers(unquote(SimpleTranscriptFormatter.clean(output.description())));
        if (title.isEmpty() || description.isEmpty()) {
            throw new IllegalStateException("Model returned a blank title or description");
        }

        int transcriptLength = SimpleTranscriptFormatter.clean(input.transcript()).length();
        if (description.length() > transcriptLength * MAX_GROWTH + GROWTH_SLACK) {
            throw new IllegalStateException("Model description is much longer than the transcript");
        }

        return new FormattedRequest(
                SimpleTranscriptFormatter.truncate(SimpleTranscriptFormatter.capitalize(title), FormattedRequest.TITLE_MAX),
                SimpleTranscriptFormatter.truncate(
                        SimpleTranscriptFormatter.capitalize(description), FormattedRequest.DESCRIPTION_MAX),
                ClassificationSource.LLM);
    }

    private static String withoutLongNumbers(String text) {
        return Arrays.stream(SENTENCE_END.split(text))
                .filter(sentence -> !LONG_NUMBER.matcher(sentence).find())
                .collect(Collectors.joining(" "));
    }

    /** Small models sometimes wrap the text in quotes. */
    private static String unquote(String text) {
        return text.replaceAll("^[\"„”«»']+|[\"„”«»']+$", "").strip();
    }

    private static String stripTrailingPeriod(String title) {
        return title.endsWith(".") && !title.endsWith("...") ? title.substring(0, title.length() - 1) : title;
    }

    private static String read(Resource resource) {
        try {
            return resource.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read prompt " + resource, e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record LlmOutput(String title, String description) {
    }
}
