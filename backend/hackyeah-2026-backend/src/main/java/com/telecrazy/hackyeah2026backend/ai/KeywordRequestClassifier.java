package com.telecrazy.hackyeah2026backend.ai;

import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.telecrazy.hackyeah2026backend.request.RequestCategory;

import org.springframework.stereotype.Component;

/**
 * Rule-based classifier used when the LLM is disabled, unavailable or returns invalid output,
 * so the demo never depends on the model. Matches Polish word stems.
 */
@Component
public class KeywordRequestClassifier {

    private static final Locale POLISH = Locale.forLanguageTag("pl");

    // Checked in order; the first category with a match wins.
    private static final Map<RequestCategory, List<String>> CATEGORY_KEYWORDS = Map.of(
            RequestCategory.BASIC_NEEDS, List.of(
                    "lek", "apte", "recept", "zakup", "jedzeni", "żywnoś", "chleb", "mlek", "sklep", "obiad"),
            RequestCategory.EQUIPMENT_LOAN, List.of(
                    "pożycz", "drabin", "wiertar", "narzęd", "młot", "wózek", "wózk", "kule ", "sprzęt"),
            RequestCategory.HOME_SUPPORT, List.of(
                    "napraw", "awari", "kran", "cieknie", "przecie", "zalan", "prąd", "żarówk", "zamek",
                    "drzwi", "okno", "ogrzewani", "kaloryfer"),
            RequestCategory.SOCIAL, List.of(
                    "spacer", "rozmow", "samotn", "towarzyst", "porozmawia", "kawę", "kawy", "planszów", "w karty")
    );
    private static final List<RequestCategory> CATEGORY_ORDER = List.of(
            RequestCategory.BASIC_NEEDS, RequestCategory.HOME_SUPPORT,
            RequestCategory.EQUIPMENT_LOAN, RequestCategory.SOCIAL);

    private static final List<String> CRITICAL_KEYWORDS = List.of(
            "serc", "insulin", "pilne", "natychmiast", "nie mam jak wyjść", "nie mogę wyjść",
            "nie wychodzę", "brak leków");
    private static final List<String> HIGH_KEYWORDS = List.of(
            "dziś", "dzisiaj", "jutro", "szybko", "awari", "zalan", "cieknie", "brak prądu", "ogrzewani");
    private static final List<String> EMERGENCY_KEYWORDS = List.of(
            "nie mogę oddychać", "duszno", "duszę się", "ból w klatce", "zawał", "udar", "omdla",
            "stracił przytomność", "krwotok");
    private static final List<String> SCAM_KEYWORDS = List.of(
            "przelew", "blik", "numer karty", "dane karty", "hasło", "kod sms", "wyślij pieniądze",
            "przelać", "pożyczk");

    public RequestClassification classify(ClassificationInput input) {
        String text = (input.title() + " " + input.description()).toLowerCase(POLISH);

        RequestCategory category = CATEGORY_ORDER.stream()
                .filter(c -> containsAny(text, CATEGORY_KEYWORDS.get(c)))
                .findFirst()
                .orElse(RequestCategory.BASIC_NEEDS);

        Set<RiskFlag> riskFlags = EnumSet.noneOf(RiskFlag.class);
        if (containsAny(text, EMERGENCY_KEYWORDS)) {
            riskFlags.add(RiskFlag.MEDICAL_EMERGENCY);
        }
        if (containsAny(text, SCAM_KEYWORDS)) {
            riskFlags.add(RiskFlag.SCAM_SUSPECTED);
        }

        int priority;
        if (riskFlags.contains(RiskFlag.MEDICAL_EMERGENCY) || containsAny(text, CRITICAL_KEYWORDS)) {
            priority = 1;
        } else if (containsAny(text, HIGH_KEYWORDS)) {
            priority = 2;
        } else {
            priority = 3;
        }

        return new RequestClassification(category, priority, tags(text), riskFlags, ClassificationSource.FALLBACK);
    }

    private static List<String> tags(String text) {
        Set<String> tags = new LinkedHashSet<>();
        if (containsAny(text, List.of("lek", "recept"))) tags.add("leki");
        if (text.contains("apte")) tags.add("apteka");
        if (containsAny(text, List.of("zakup", "sklep", "jedzeni", "żywnoś"))) tags.add("zakupy");
        if (text.contains("drabin")) tags.add("drabina");
        if (containsAny(text, List.of("narzęd", "wiertar", "młot"))) tags.add("narzędzia");
        if (containsAny(text, List.of("napraw", "awari"))) tags.add("naprawa");
        if (containsAny(text, List.of("spacer", "rozmow", "towarzyst", "samotn"))) tags.add("towarzystwo");
        return tags.stream().limit(LlmRequestClassifier.MAX_TAGS).toList();
    }

    private static boolean containsAny(String text, List<String> keywords) {
        return keywords.stream().anyMatch(text::contains);
    }
}
