package com.telecrazy.hackyeah2026backend.ai;

import java.util.List;
import java.util.Set;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

/**
 * For legal reasons the app must not store or show medicine names, doses or how they are used.
 * Requests classified as {@link HelpCategory#MEDICINE} keep only a generic title and description,
 * get the {@link RequestClassification#SPECIAL} priority, and the requester gives the volunteer the details in person.
 */
public final class MedicineRedaction {

    public static final String TITLE = "Prośba o pomoc z lekami";
    public static final String DESCRIPTION = "Prośba dotyczy leków. Szczegóły zostaną przekazane osobiście.";

    /** Tags that say a request is about medicine without naming any. */
    private static final Set<String> ALLOWED_TAGS = Set.of("leki", "apteka");
    private static final List<String> DEFAULT_TAGS = List.of("leki");

    private MedicineRedaction() {
    }

    public static boolean applies(HelpCategory category) {
        return category == HelpCategory.MEDICINE;
    }

    /** Special priority and only generic tags for medicine requests; other classifications are returned unchanged. */
    static RequestClassification apply(RequestClassification classification) {
        if (!applies(classification.category())) {
            return classification;
        }
        List<String> tags = classification.tags().stream().filter(ALLOWED_TAGS::contains).toList();
        return new RequestClassification(
                classification.category(),
                RequestClassification.SPECIAL,
                tags.isEmpty() ? DEFAULT_TAGS : tags,
                classification.riskFlags(),
                classification.source()
        );
    }
}
