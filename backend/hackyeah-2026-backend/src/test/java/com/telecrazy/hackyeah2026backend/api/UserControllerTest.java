package com.telecrazy.hackyeah2026backend.api;

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

import static org.hamcrest.Matchers.contains;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import(WebConfig.class)
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

    private static AppUser user(long id, String name, UserRole role) {
        AppUser user = new AppUser(name, role, true, false, 50);
        user.setId(id);
        return user;
    }
}
