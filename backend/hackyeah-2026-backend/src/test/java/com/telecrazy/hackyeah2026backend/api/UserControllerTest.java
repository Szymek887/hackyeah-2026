package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.config.ClockConfig;
import com.telecrazy.hackyeah2026backend.config.WebConfig;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.DisabilityType;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.service.SpecialNeedsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import({WebConfig.class, ClockConfig.class, SpecialNeedsService.class})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppUserRepository userRepository;

    @Test
    void demoListsAccountsByRoleThenIdWithoutAuthentication() throws Exception {
        given(userRepository.findAll()).willReturn(List.of(
                user(13L, "Miasto Kraków", UserRole.CITY_ADMIN),
                user(10L, "Ola D.", UserRole.VOLUNTEER),
                user(2L, "Marek S.", UserRole.REQUESTER),
                user(9L, "Kuba W.", UserRole.VOLUNTEER),
                user(1L, "Anna K.", UserRole.REQUESTER)
        ));

        mockMvc.perform(get("/api/users/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(contains(1, 2, 9, 10, 13)))
                .andExpect(jsonPath("$[0].role").value("REQUESTER"))
                .andExpect(jsonPath("$[2].displayName").value("Kuba W."))
                .andExpect(jsonPath("$[4].role").value("CITY_ADMIN"))
                .andExpect(jsonPath("$[0].cityPoints").value(0));
    }

    @Test
    void returnsProfileOfUserFromHeader() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.replaceDisabilities(List.of(DisabilityType.CHRONIC));
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));

        mockMvc.perform(get("/api/users/me").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.displayName").value("Anna K."))
                .andExpect(jsonPath("$.role").value("REQUESTER"))
                .andExpect(jsonPath("$.identityVerified").value(true))
                .andExpect(jsonPath("$.specialNeeds").value(true))
                .andExpect(jsonPath("$.trustScore").value(72))
                .andExpect(jsonPath("$.ratingCount").value(0));
    }

    @Test
    void profileListsSpokenLanguagesSorted() throws Exception {
        AppUser kuba = user(9L, "Kuba W.", UserRole.VOLUNTEER);
        kuba.replaceLanguages(List.of("uk", "pl", "en"));
        given(userRepository.findById(9L)).willReturn(Optional.of(kuba));

        mockMvc.perform(get("/api/users/me").header("X-User-Id", "9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.languages").value(contains("en", "pl", "uk")));
    }

    @Test
    void updateLanguagesNormalizesAndReplacesList() throws Exception {
        AppUser anna = user(1L, "Anna K.", UserRole.REQUESTER);
        anna.replaceLanguages(List.of("de"));
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));
        given(userRepository.save(any(AppUser.class))).willAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/api/users/me/languages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"languages\": [\" UK \", \"pl\", \"uk\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.languages").value(contains("pl", "uk")));
    }

    @Test
    void updateLanguagesRejectsUnknownCode() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(user(1L, "Anna K.", UserRole.REQUESTER)));

        mockMvc.perform(put("/api/users/me/languages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"languages\": [\"pl\", \"xx\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Unknown language code: xx"));
        then(userRepository).should(never()).save(any());
    }

    @Test
    void updateLanguagesRejectsEmptyList() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(user(1L, "Anna K.", UserRole.REQUESTER)));

        mockMvc.perform(put("/api/users/me/languages")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"languages\": []}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.languages").exists());
    }

    @Test
    void profileShowsConsentRecord() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(requesterWithSpecialNeeds()));

        mockMvc.perform(get("/api/users/me").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                // Consent alone does not mark the user as disabled – disabilities do.
                .andExpect(jsonPath("$.specialNeeds").value(false))
                .andExpect(jsonPath("$.specialNeedsConsent").value(true))
                .andExpect(jsonPath("$.specialNeedsConsentGrantedAt").value("2026-10-01T10:00:00Z"));
    }

    @Test
    void withdrawingConsentDeletesConsentAndSpecialNeeds() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.replaceDisabilities(List.of(DisabilityType.VISION));
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));
        given(userRepository.save(any(AppUser.class))).willAnswer(invocation -> invocation.getArgument(0));

        putConsent(false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialNeedsConsent").value(false))
                .andExpect(jsonPath("$.specialNeedsConsentGrantedAt").value(nullValue()))
                .andExpect(jsonPath("$.specialNeeds").value(false));
        assertThat(anna.getSpecialNeedsConsent()).isNull();
        assertThat(anna.isSpecialNeeds()).isFalse();
    }

    @Test
    void grantingConsentAgainCreatesRecordWithoutMarkingUserAsDisabled() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.replaceDisabilities(List.of(DisabilityType.VISION));
        anna.withdrawSpecialNeedsConsent();
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));
        given(userRepository.save(any(AppUser.class))).willAnswer(invocation -> invocation.getArgument(0));

        putConsent(true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialNeedsConsent").value(true))
                .andExpect(jsonPath("$.specialNeedsConsentGrantedAt").isNotEmpty())
                .andExpect(jsonPath("$.specialNeeds").value(false))
                .andExpect(jsonPath("$.disabilities").isEmpty());
        assertThat(anna.sharesSpecialNeeds()).isFalse();
    }

    @Test
    void disabilitiesAreStoredWithConsentAndReturnedSorted() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));
        given(userRepository.save(any(AppUser.class))).willAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/api/users/me/disabilities")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"disabilities\": [\"VISION\", \"CHRONIC\", \"VISION\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disabilities").value(contains("VISION", "CHRONIC")))
                .andExpect(jsonPath("$.specialNeeds").value(true));
        assertThat(anna.getDisabilities()).containsExactlyInAnyOrder(DisabilityType.VISION, DisabilityType.CHRONIC);
    }

    @Test
    void clearingDisabilitiesRemovesMarkingButKeepsConsent() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.replaceDisabilities(List.of(DisabilityType.VISION));
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));

        mockMvc.perform(put("/api/users/me/disabilities")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"disabilities\": []}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disabilities").isEmpty())
                .andExpect(jsonPath("$.specialNeeds").value(false))
                .andExpect(jsonPath("$.specialNeedsConsent").value(true));
    }

    @Test
    void disabilitiesRequireConsent() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.withdrawSpecialNeedsConsent();
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));

        mockMvc.perform(put("/api/users/me/disabilities")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"disabilities\": [\"VISION\"]}"))
                .andExpect(status().isConflict());
        then(userRepository).should(never()).save(any());
    }

    @Test
    void onlyRequestersStoreDisabilities() throws Exception {
        given(userRepository.findById(9L)).willReturn(Optional.of(user(9L, "Kuba W.", UserRole.VOLUNTEER)));

        mockMvc.perform(put("/api/users/me/disabilities")
                        .header("X-User-Id", "9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"disabilities\": [\"VISION\"]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void unknownDisabilityIsRejected() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(requesterWithSpecialNeeds()));

        mockMvc.perform(put("/api/users/me/disabilities")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"disabilities\": [\"TELEPATHY\"]}"))
                .andExpect(status().isBadRequest());
        then(userRepository).should(never()).save(any());
    }

    @Test
    void withdrawingConsentAlsoDeletesDisabilities() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.replaceDisabilities(List.of(DisabilityType.MOBILITY));
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));
        given(userRepository.save(any(AppUser.class))).willAnswer(invocation -> invocation.getArgument(0));

        putConsent(false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disabilities").isEmpty());
        assertThat(anna.getDisabilities()).isEmpty();
    }

    @Test
    void demoListNeverExposesDisabilities() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.replaceDisabilities(List.of(DisabilityType.CHRONIC));
        anna.replaceSpecialNeedNotes(List.of("Nie słyszę pukania"));
        given(userRepository.findAll()).willReturn(List.of(anna));

        String body = mockMvc.perform(get("/api/users/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].disabilities").isEmpty())
                .andExpect(jsonPath("$[0].specialNeedNotes").isEmpty())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("CHRONIC").doesNotContain("pukania");
    }

    @Test
    void specialNeedNotesAreStoredTrimmedInOrderWithoutMarkingUserAsDisabled() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));

        putNotes("{\"notes\": [\"  Nie słyszę pukania \", \"\", \"3. piętro bez windy\", \"Nie słyszę pukania\"]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialNeedNotes").value(contains("Nie słyszę pukania", "3. piętro bez windy")))
                .andExpect(jsonPath("$.specialNeeds").value(false));
        assertThat(anna.getSpecialNeedNotes()).containsExactly("Nie słyszę pukania", "3. piętro bez windy");
    }

    @Test
    void specialNeedNotesRequireConsent() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.withdrawSpecialNeedsConsent();
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));

        putNotes("{\"notes\": [\"Nie słyszę pukania\"]}").andExpect(status().isConflict());
        assertThat(anna.getSpecialNeedNotes()).isEmpty();
    }

    @Test
    void onlyRequestersStoreSpecialNeedNotes() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(user(1L, "Kuba W.", UserRole.VOLUNTEER)));

        putNotes("{\"notes\": [\"Nie słyszę pukania\"]}").andExpect(status().isForbidden());
    }

    @Test
    void tooLongSpecialNeedNoteIsRejected() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(requesterWithSpecialNeeds()));

        putNotes("{\"notes\": [\"" + "a".repeat(201) + "\"]}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").exists());
    }

    @Test
    void withdrawingConsentAlsoDeletesSpecialNeedNotes() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        anna.replaceSpecialNeedNotes(List.of("Nie słyszę pukania"));
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));

        putConsent(false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialNeedNotes").isEmpty());
        assertThat(anna.getSpecialNeedNotes()).isEmpty();
    }

    private ResultActions putNotes(String json) throws Exception {
        return mockMvc.perform(put("/api/users/me/special-need-notes")
                .header("X-User-Id", "1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    @Test
    void onlyRequestersManageSpecialNeedsConsent() throws Exception {
        given(userRepository.findById(9L)).willReturn(Optional.of(user(9L, "Kuba W.", UserRole.VOLUNTEER)));

        mockMvc.perform(put("/api/users/me/special-needs-consent")
                        .header("X-User-Id", "9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"consent\": true}"))
                .andExpect(status().isForbidden());
        then(userRepository).should(never()).save(any());
    }

    @Test
    void specialNeedsConsentRequiresExplicitValue() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(requesterWithSpecialNeeds()));

        mockMvc.perform(put("/api/users/me/special-needs-consent")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.consent").exists());
        then(userRepository).should(never()).save(any());
    }

    private ResultActions putConsent(boolean consent) throws Exception {
        return mockMvc.perform(put("/api/users/me/special-needs-consent")
                .header("X-User-Id", "1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"consent\": " + consent + "}"));
    }

    @Test
    void missingHeaderReturns401() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.detail").value("Missing X-User-Id header"));
    }

    @Test
    void nonNumericHeaderReturns401() throws Exception {
        mockMvc.perform(get("/api/users/me").header("X-User-Id", "abc"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownUserReturns401() throws Exception {
        given(userRepository.findById(999L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/users/me").header("X-User-Id", "999"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Unknown user 999"));
    }

    /** Requester who gave the consent but has not declared any disabilities yet. */
    private static AppUser requesterWithSpecialNeeds() {
        AppUser anna = new AppUser("Anna K.", UserRole.REQUESTER, true, 72);
        anna.setId(1L);
        anna.grantSpecialNeedsConsent(Instant.parse("2026-10-01T10:00:00Z"));
        return anna;
    }

    private static AppUser user(long id, String name, UserRole role) {
        AppUser user = new AppUser(name, role, true, 50);
        user.setId(id);
        return user;
    }
}
