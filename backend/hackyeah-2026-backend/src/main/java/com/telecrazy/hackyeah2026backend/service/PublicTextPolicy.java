package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.MedicineRedaction;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;

/**
 * Free-text fields shown to people other than the requester. When the classifier detected personal
 * data, both title and description are user input that may contain it, so the title is replaced
 * with a generic one built from the category and the description is withheld.
 */
public final class PublicTextPolicy {

    private PublicTextPolicy() {
    }

    public static String publicTitle(HelpRequest request) {
        return containsPersonalData(request) ? genericTitle(request.getCategory()) : request.getTitle();
    }

    /** {@code null} when the description may contain personal data. */
    public static String publicDescription(HelpRequest request) {
        return containsPersonalData(request) ? null : request.getDescription();
    }

    static String genericTitle(HelpCategory category) {
        return switch (category) {
            case MEDICINE -> MedicineRedaction.TITLE;
            case GROCERIES -> "Prośba o pomoc z zakupami";
            case EQUIPMENT_LOAN -> "Prośba o pożyczenie sprzętu";
            case HOME_SUPPORT -> "Prośba o pomoc w domu";
            case SOCIAL -> "Prośba o towarzystwo";
        };
    }

    private static boolean containsPersonalData(HelpRequest request) {
        return request.getRiskFlags().contains(RiskFlag.PERSONAL_DATA);
    }
}
