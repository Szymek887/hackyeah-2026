package com.telecrazy.hackyeah2026backend.ai;

import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

import org.springframework.stereotype.Component;

/**
 * Rule-based classifier used when the LLM is disabled, unavailable or returns invalid output,
 * so the demo never depends on the model. Matches Polish word stems.
 */
@Component
public class KeywordRequestClassifier {

    private static final Locale POLISH = Locale.forLanguageTag("pl");

    // Checked in order; the first category with a match wins.
    private static final Map<HelpCategory, List<String>> CATEGORY_KEYWORDS = Map.of(
            HelpCategory.MEDICINE, List.of(
                    "lek", "apte", "recept", "tablet", "insulin", "opatrun", "ciśnieni"),
            HelpCategory.GROCERIES, List.of(
                    "zakup", "jedzeni", "żywnoś", "chleb", "mlek", "sklep", "obiad", "warzyw", "owoc"),
            HelpCategory.EQUIPMENT_LOAN, List.of(
                    "pożycz", "drabin", "wiertar", "narzęd", "młot", "wózek", "wózk", "kule ", "sprzęt"),
            HelpCategory.HOME_SUPPORT, List.of(
                    "napraw", "awari", "kran", "cieknie", "przecie", "zalan", "prąd", "żarówk", "zamek",
                    "drzwi", "okno", "ogrzewani", "kaloryfer", "wniosek", "formularz", "pismo"),
            HelpCategory.SOCIAL, List.of(
                    "spacer", "rozmow", "samotn", "towarzyst", "porozmawia", "kawę", "kawy", "planszów", "w karty")
    );
    private static final List<HelpCategory> CATEGORY_ORDER = List.of(
            HelpCategory.MEDICINE, HelpCategory.GROCERIES, HelpCategory.EQUIPMENT_LOAN,
            HelpCategory.HOME_SUPPORT, HelpCategory.SOCIAL);

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

        Set<RiskFlag> riskFlags = EnumSet.noneOf(RiskFlag.class);
        if (containsAny(text, EMERGENCY_KEYWORDS)) {
            riskFlags.add(RiskFlag.MEDICAL_EMERGENCY);
        }

        // Unmatched requests default to groceries, the most common basic need.
        HelpCategory category = riskFlags.contains(RiskFlag.MEDICAL_EMERGENCY)
                ? HelpCategory.MEDICINE
                : CATEGORY_ORDER.stream()
                        .filter(c -> containsAny(text, CATEGORY_KEYWORDS.get(c)))
                        .findFirst()
                        .orElse(HelpCategory.GROCERIES);
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
        if (containsAtWordStart(text, "apte")) tags.add("apteka");
        if (containsAny(text, List.of("zakup", "sklep", "jedzeni", "żywnoś"))) tags.add("zakupy");
        if (containsAtWordStart(text, "drabin")) tags.add("drabina");
        if (containsAny(text, List.of("narzęd", "wiertar", "młot"))) tags.add("narzędzia");
        if (containsAny(text, List.of("napraw", "awari"))) tags.add("naprawa");
        if (containsAny(text, List.of("wniosek", "formularz", "pismo"))) tags.add("dokumenty");
        if (containsAny(text, List.of("spacer", "rozmow", "towarzyst", "samotn"))) tags.add("towarzystwo");
        return tags.stream().limit(LlmRequestClassifier.MAX_TAGS).toList();
    }

    private static boolean containsAny(String text, List<String> keywords) {
        return keywords.stream().anyMatch(keyword -> containsAtWordStart(text, keyword));
    }

    /** Matches stems only at the start of a word, so "lek" matches "leki" but not "mleka". */
    private static boolean containsAtWordStart(String text, String keyword) {
        for (int index = text.indexOf(keyword); index >= 0; index = text.indexOf(keyword, index + 1)) {
            if (index == 0 || !Character.isLetter(text.charAt(index - 1))) {
                return true;
            }
        }
        return false;
    }
}
