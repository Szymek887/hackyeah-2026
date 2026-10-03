package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.exception.ConflictException;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void illegalArgumentMapsTo400() throws Exception {
        expectProblem("/bad-request", 400, "Bad Request", "lat must be between -90 and 90");
    }

    @Test
    void forbiddenMapsTo403() throws Exception {
        expectProblem("/forbidden", 403, "Forbidden", "Only the requester can accept");
    }

    @Test
    void notFoundMapsTo404() throws Exception {
        expectProblem("/not-found", 404, "Not Found", "Help request 42 not found");
    }

    @Test
    void conflictMapsTo409() throws Exception {
        expectProblem("/conflict", 409, "Conflict", "Help request is already taken");
    }

    @Test
    void optimisticLockMapsTo409() throws Exception {
        expectProblem("/optimistic-lock", 409, "Conflict", "Resource was modified concurrently, please retry");
    }

    @Test
    void validationErrorsAreListedPerField() throws Exception {
        mockMvc.perform(post("/validated").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Request validation failed"))
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void malformedBodyMapsTo400() throws Exception {
        mockMvc.perform(post("/validated").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Malformed request body"));
    }

    private void expectProblem(String path, int status, String title, String detail) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().is(status))
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.detail").value(detail))
                .andExpect(jsonPath("$.instance").value(path))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    record TitleBody(@NotBlank String title) {
    }

    @RestController
    static class ThrowingController {

        @GetMapping("/bad-request")
        void badRequest() {
            throw new IllegalArgumentException("lat must be between -90 and 90");
        }

        @GetMapping("/forbidden")
        void forbidden() {
            throw new ForbiddenException("Only the requester can accept");
        }

        @GetMapping("/not-found")
        void notFound() {
            throw new NotFoundException("Help request 42 not found");
        }

        @GetMapping("/conflict")
        void conflict() {
            throw new ConflictException("Help request is already taken");
        }

        @GetMapping("/optimistic-lock")
        void optimisticLock() {
            throw new OptimisticLockingFailureException("stale version");
        }

        @PostMapping("/validated")
        void validated(@Valid @RequestBody TitleBody body) {
        }
    }
}
