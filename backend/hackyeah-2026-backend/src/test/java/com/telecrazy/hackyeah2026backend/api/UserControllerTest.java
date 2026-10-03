package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.config.WebConfig;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
                .andExpect(jsonPath("$.status").value(401));
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
                .andExpect(jsonPath("$.message").value("Unknown user 999"));
    }
}
