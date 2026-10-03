package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.config.ClockConfig;
import com.telecrazy.hackyeah2026backend.config.WebConfig;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
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
@Import({WebConfig.class, ClockConfig.class})
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
        AppUser anna = new AppUser("Anna K.", UserRole.REQUESTER, true, true, 72);
        anna.setId(1L);
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
    void specialNeedsConsentIsOffByDefault() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(requesterWithSpecialNeeds()));

        mockMvc.perform(get("/api/users/me").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.specialNeeds").value(true))
                .andExpect(jsonPath("$.shareSpecialNeeds").value(false));
    }

    @Test
    void specialNeedsConsentCanBeGivenAndWithdrawn() throws Exception {
        AppUser anna = requesterWithSpecialNeeds();
        given(userRepository.findById(1L)).willReturn(Optional.of(anna));
        given(userRepository.save(any(AppUser.class))).willAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/api/users/me/special-needs-consent")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shareWithVolunteer\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareSpecialNeeds").value(true));
        assertThat(anna.sharesSpecialNeeds()).isTrue();
        assertThat(anna.getSpecialNeedsConsentUpdatedAt()).isNotNull();

        mockMvc.perform(put("/api/users/me/special-needs-consent")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shareWithVolunteer\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareSpecialNeeds").value(false));
        assertThat(anna.sharesSpecialNeeds()).isFalse();
    }

    @Test
    void specialNeedsConsentRequiresExplicitValue() throws Exception {
        given(userRepository.findById(1L)).willReturn(Optional.of(requesterWithSpecialNeeds()));

        mockMvc.perform(put("/api/users/me/special-needs-consent")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.shareWithVolunteer").exists());
        then(userRepository).should(never()).save(any());
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

    private static AppUser requesterWithSpecialNeeds() {
        AppUser anna = new AppUser("Anna K.", UserRole.REQUESTER, true, true, 72);
        anna.setId(1L);
        return anna;
    }

    private static AppUser user(long id, String name, UserRole role) {
        AppUser user = new AppUser(name, role, true, false, 50);
        user.setId(id);
        return user;
    }
}
