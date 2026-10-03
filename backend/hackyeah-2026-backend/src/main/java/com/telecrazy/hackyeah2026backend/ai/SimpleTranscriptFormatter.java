package com.telecrazy.hackyeah2026backend.ai;

import java.util.Arrays;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * Rule-based formatting used when the LLM is disabled, unavailable or returns invalid output:
 * the transcript without greetings, filler words and stuttered repeats becomes the description,
 * and its first sentence the title.
 *
 * <p>Ported to the frontend mocks ({@code src/api/mocks/transcript.ts}); keep both in sync.
 */
@Component
public class SimpleTranscriptFormatter {

    static final int TITLE_WORDS = 8;

    private static final Locale POLISH = Locale.forLanguageTag("pl");

    /** Spoken greeting at the start that makes a poor title ("dzień dobry, chciałabym…"). */
    private static final Pattern OPENERS = Pattern.compile(
            "^(dzień dobry|dobry wieczór|halo|cześć|witam|proszę pani|proszę pana)[,.!\\s]*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    /** Hesitation sounds and spoken fillers that carry no meaning. */
    private static final Pattern FILLERS = Pattern.compile(
            "(?<![\\p{L}])(y+|e+|m+|hm+|yhm|no|wie pan[i]?|znaczy|tak jakby|po prostu)(?![\\p{L}])[,]?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    /** The same word said twice in a row ("żeby żeby", "potrzebuję, potrzebuję"). */
    private static final Pattern REPEATED_WORD = Pattern.compile(
            "(?<![\\p{L}])(\\p{L}+)(?:,? \\1)+(?![\\p{L}])", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    public FormattedRequest format(TranscriptInput input) {
        String text = tidy(REPEATED_WORD.matcher(FILLERS.matcher(clean(input.transcript())).replaceAll(""))
                .replaceAll("$1"));
        String withoutOpener;
        while (!(withoutOpener = tidy(OPENERS.matcher(text).replaceFirst(""))).equals(text)) {
            text = withoutOpener;
        }
        if (text.isEmpty()) {
            text = clean(input.transcript());
        }
        String description = truncate(capitalize(text), FormattedRequest.DESCRIPTION_MAX);
        return new FormattedRequest(title(description), description, ClassificationSource.FALLBACK);
    }

    private static String title(String description) {
        String firstSentence = description.split("[.!?]", 2)[0].trim();
        String[] words = (firstSentence.isEmpty() ? description : firstSentence).split(" ");
        String title = String.join(" ", Arrays.copyOf(words, Math.min(words.length, TITLE_WORDS)));
        return truncate(title + (words.length > TITLE_WORDS ? "…" : ""), FormattedRequest.TITLE_MAX);
    }

    /** Collapses whitespace and the punctuation left over after removing words. */
    private static String tidy(String text) {
        return clean(text)
                .replaceAll(" +([,.!?])", "$1")
                .replaceAll("([,.!?])(?:[ ,]*,)+", "$1")
                .replaceAll("^[,.!? ]+", "");
    }

    /** Trims and collapses whitespace, including line breaks. */
    static String clean(String text) {
        return text == null ? "" : text.strip().replaceAll("\\s+", " ");
    }

    static String capitalize(String text) {
        return text.isEmpty() ? text : text.substring(0, 1).toUpperCase(POLISH) + text.substring(1);
    }

    /** Cuts at the last word boundary that fits, ending with "…". */
    static String truncate(String text, int max) {
        if (text.length() <= max) {
            return text;
        }
        String cut = text.substring(0, max - 1);
        int space = cut.lastIndexOf(' ');
        return (space > 0 ? cut.substring(0, space) : cut).strip() + "…";
    }
}
