package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;

import java.util.List;

final class MedicineRequestPolicy {

    static final String SAFE_TITLE = "Odbiór leków z apteki";
    static final String SAFE_DESCRIPTION =
            "Pomoc w odbiorze leków z apteki. Dane e-recepty nie są przechowywane w aplikacji.";
    static final List<String> TAGS = List.of("leki", "apteka");

    static final String REQUESTER_INSTRUCTIONS =
            "Nie wpisuj w aplikacji kodu e-recepty, PESEL-u, kodu QR, nazwy leku ani informacji o chorobie. "
                    + "Dane potrzebne do odbioru przekaż wolontariuszowi bezpośrednio poza aplikacją.";

    static final String VOLUNTEER_INSTRUCTIONS =
            "Odbierz leki w legalnej aptece. Nie proś o kod e-recepty, PESEL, kod QR ani informacje medyczne "
                    + "w aplikacji; potrzebne dane pacjent przekazuje bezpośrednio poza aplikacją.";

    private MedicineRequestPolicy() {
    }

    static boolean isMedicine(HelpCategory category) {
        return category == HelpCategory.MEDICINE;
    }

    static String requesterInstructions(HelpRequest request) {
        return isMedicine(request.getCategory()) ? REQUESTER_INSTRUCTIONS : null;
    }

    static String volunteerInstructions(HelpRequest request) {
        return isMedicine(request.getCategory()) ? VOLUNTEER_INSTRUCTIONS : null;
    }
}
