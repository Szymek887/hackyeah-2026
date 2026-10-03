package com.telecrazy.hackyeah2026backend.ai;

import java.util.Comparator;
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
 * so the demo never depends on the model. Matches Polish word stems, including everyday spoken
 * phrases (requests are often dictated by voice).
 *
 * <p>Every category is scored by the number of matching stems and the best one wins (ties go to
 * the more important category). Critical requests that mention health go to {@code MEDICINE}.
 * A request matching nothing is {@code HOME_SUPPORT} – general help at home.
 *
 * <p>Ported 1:1 to the frontend mocks ({@code src/api/mocks/classifier.ts}); keep both in sync.
 */
@Component
public class KeywordRequestClassifier {

    private static final Locale POLISH = Locale.forLanguageTag("pl");

    private static final Map<HelpCategory, List<String>> CATEGORY_KEYWORDS = Map.of(
            HelpCategory.MEDICINE, List.of(
                    "lek", "apte", "recept", "tablet", "insulin", "opatrun", "ciśnieni", "zdrow",
                    "chor", "ból", "boli", "bolą", "gorącz", "temperatur", "przezięb", "kaszel", "kaszl",
                    "gryp", "zawrot", "słabo", "źle się czuję", "upad", "przewróci", "nie mogę wstać",
                    "serc", "cukrzyc", "przychodni", "szpital", "pielęgniar", "zastrzyk", "syrop",
                    "maść", "maści", "witamin", "termometr", "inhalator", "plaster", "bandaż", "okular"),
            HelpCategory.GROCERIES, List.of(
                    "zakup", "kup", "jedzeni", "jedzeniem", "głodn", "żywnoś", "chleb", "bułk", "mlek",
                    "mleko", "masł", "jaj", "mięs", "wędlin", "ser ", "sera", "kasz", "makaron", "ryż",
                    "cukru", "cukier", "herbat", "wod", "napoj", "picia", "karm", "sklep", "market",
                    "biedronk", "lidl", "obiad", "kolacj", "śniadani", "warzyw", "owoc", "ziemniak",
                    "papier toaletow", "proszek do prania"),
            HelpCategory.EQUIPMENT_LOAN, List.of(
                    "pożycz", "drabin", "wiertar", "wkrętar", "narzęd", "młot", "wózek", "wózk",
                    "balkonik", "chodzik", "kule ", "sprzęt", "odkurzacz", "przedłużacz"),
            HelpCategory.HOME_SUPPORT, List.of(
                    "napraw", "awari", "zepsu", "nie działa", "kran", "cieknie", "przecie", "zalan",
                    "prąd", "żarówk", "zamek", "drzwi", "okno", "ogrzewani", "kaloryfer", "wniosek",
                    "formularz", "pismo", "dokument", "urząd", "urzęd", "poczt", "rachun", "opłat",
                    "wnieś", "wynieś", "śmieci", "sprząt", "posprząt", "pranie", "węgl", "drew",
                    "odśnież", "mebl", "przesun", "pies", "psa", "kot ", "kota", "telewizor", "telefon",
                    "komputer", "internet"),
            HelpCategory.SOCIAL, List.of(
                    "spacer", "rozmow", "samotn", "towarzyst", "porozmawia", "pogada", "odwiedzi",
                    "odwiedz", "smutn", "kawę", "kawy", "planszów", "w karty", "kościoł", "kościel", "msz",
                    "cmentarz", "poczyta", "książk")
    );
    /** Tie-break order: health first, social last. */
    private static final List<HelpCategory> CATEGORY_ORDER = List.of(
            HelpCategory.MEDICINE, HelpCategory.GROCERIES, HelpCategory.EQUIPMENT_LOAN,
            HelpCategory.HOME_SUPPORT, HelpCategory.SOCIAL);

    private static final List<String> CRITICAL_KEYWORDS = List.of(
            "serc", "insulin", "pilne", "pilnie", "natychmiast", "jak najszybciej", "nie mam jak wyjść",
            "nie mogę wyjść", "nie wychodzę", "brak leków", "nie mam leków", "skończyły mi się leki",
            "nie mam jedzenia", "nic do jedzenia", "głodn", "upad", "przewróci", "nie mogę wstać",
            "źle się czuję", "cukrzyc");
    private static final List<String> HIGH_KEYWORDS = List.of(
            "dziś", "dzisiaj", "jutro", "szybko", "awari", "zalan", "cieknie", "brak prądu",
            "ogrzewani", "ból", "boli", "gorącz", "chor", "zepsu", "nie działa");
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

        return new RequestClassification(
                category(text, riskFlags, priority), priority, tags(text), riskFlags,
                ClassificationSource.FALLBACK);
    }

    private static HelpCategory category(String text, Set<RiskFlag> riskFlags, int priority) {
        int medicine = score(text, HelpCategory.MEDICINE);
        // A health emergency, or a critical request that mentions health, is about health first.
        if (riskFlags.contains(RiskFlag.MEDICAL_EMERGENCY) || (priority == 1 && medicine > 0)) {
            return HelpCategory.MEDICINE;
        }
        return CATEGORY_ORDER.stream()
                .filter(c -> score(text, c) > 0)
                // Highest score wins; on a tie the earlier category in CATEGORY_ORDER.
                .max(Comparator.comparingInt((HelpCategory c) -> score(text, c))
                        .thenComparing(c -> -CATEGORY_ORDER.indexOf(c)))
                .orElse(HelpCategory.HOME_SUPPORT);
    }

    private static int score(String text, HelpCategory category) {
        return (int) CATEGORY_KEYWORDS.get(category).stream()
                .filter(keyword -> containsAtWordStart(text, keyword))
                .count();
    }

    private static List<String> tags(String text) {
        Set<String> tags = new LinkedHashSet<>();
        if (containsAny(text, List.of("lek", "recept", "tablet"))) tags.add("leki");
        if (containsAtWordStart(text, "apte")) tags.add("apteka");
        if (containsAny(text, List.of("chor", "ból", "boli", "gorącz", "zawrot", "źle się czuję", "upad",
                "przewróci", "serc", "cukrzyc"))) tags.add("zdrowie");
        if (containsAny(text, List.of("przychodni", "szpital", "pielęgniar"))) tags.add("wizyta lekarska");
        if (containsAny(text, List.of("zakup", "kup", "sklep", "jedzeni", "żywnoś"))) tags.add("zakupy");
        if (containsAny(text, List.of("obiad", "kolacj", "śniadani", "głodn"))) tags.add("posiłek");
        if (containsAtWordStart(text, "drabin")) tags.add("drabina");
        if (containsAny(text, List.of("narzęd", "wiertar", "wkrętar", "młot"))) tags.add("narzędzia");
        if (containsAny(text, List.of("wózek", "wózk", "balkonik", "chodzik", "kule "))) tags.add("sprzęt rehabilitacyjny");
        if (containsAny(text, List.of("napraw", "awari", "zepsu", "nie działa"))) tags.add("naprawa");
        if (containsAny(text, List.of("sprząt", "posprząt", "śmieci", "pranie"))) tags.add("sprzątanie");
        if (containsAny(text, List.of("wniosek", "formularz", "pismo", "dokument", "urząd", "urzęd"))) tags.add("dokumenty");
        if (containsAny(text, List.of("pies", "psa", "kot ", "kota"))) tags.add("zwierzęta");
        if (containsAny(text, List.of("spacer", "rozmow", "towarzyst", "samotn", "odwiedz", "odwiedzi"))) tags.add("towarzystwo");
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
