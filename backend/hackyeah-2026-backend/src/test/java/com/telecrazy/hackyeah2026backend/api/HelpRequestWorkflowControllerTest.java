package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.ai.RequestClassificationService;
import com.telecrazy.hackyeah2026backend.config.ClockConfig;
import com.telecrazy.hackyeah2026backend.config.WebConfig;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import com.telecrazy.hackyeah2026backend.repository.RatingRepository;
import com.telecrazy.hackyeah2026backend.service.HelpRequestDetailsService;
import com.telecrazy.hackyeah2026backend.service.HelpRequestService;
import com.telecrazy.hackyeah2026backend.service.HelpRequestViewMapper;
import com.telecrazy.hackyeah2026backend.service.HelpRequestWorkflowService;
import com.telecrazy.hackyeah2026backend.service.LocationObfuscationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({HelpRequestWorkflowController.class, HelpRequestController.class})
@Import({
        WebConfig.class,
        ClockConfig.class,
        HelpRequestWorkflowService.class,
        HelpRequestService.class,
        HelpRequestDetailsService.class,
        HelpRequestViewMapper.class,
        LocationObfuscationService.class
})
class HelpRequestWorkflowControllerTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);
    private static final String TOKEN = "qr-token-of-request-10";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppUserRepository userRepository;
    @MockitoBean
    private HelpRequestRepository helpRequestRepository;
    @MockitoBean
    private RatingRepository ratingRepository;
    @MockitoBean
    private RequestClassificationService classificationService;

    private final AppUser requester = user(1L, "Anna K.", UserRole.REQUESTER);
    private final AppUser volunteer = user(9L, "Kuba W.", UserRole.VOLUNTEER);
    private final AppUser otherVolunteer = user(10L, "Ola D.", UserRole.VOLUNTEER);

    private HelpRequest request;

    @BeforeEach
    void setUp() {
        request = storedRequest();
        for (AppUser user : List.of(requester, volunteer, otherVolunteer)) {
            given(userRepository.findById(user.getId())).willReturn(Optional.of(user));
            given(userRepository.findByIdForUpdate(user.getId())).willReturn(Optional.of(user));
        }
        given(helpRequestRepository.findByIdForUpdate(10L)).willAnswer(invocation -> Optional.of(request));
        given(helpRequestRepository.saveAndFlush(any(HelpRequest.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void offerReturnsPublicViewMarkedAsVolunteer() throws Exception {
        mockMvc.perform(post("/api/help-requests/10/offer").header("X-User-Id", "9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OFFERED"))
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
                .andExpect(jsonPath("$.viewerRole").value("VOLUNTEER"))
                .andExpect(jsonPath("$.street").doesNotExist());
    }

    @Test
    void offerOnTakenRequestIs409() throws Exception {
        request.setStatus(HelpRequestStatus.OFFERED);
        request.setVolunteer(volunteer);

        mockMvc.perform(post("/api/help-requests/10/offer").header("X-User-Id", "10"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Help request is no longer open"));
    }

    @Test
    void requesterCannotOffer403() throws Exception {
        mockMvc.perform(post("/api/help-requests/10/offer").header("X-User-Id", "1"))
                .andExpect(status().isForbidden());
    }

    @Test
    void actionsRequireUserHeader() throws Exception {
        mockMvc.perform(post("/api/help-requests/10/offer"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/help-requests/mine"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void acceptReturnsFullViewWithVolunteer() throws Exception {
        request.setStatus(HelpRequestStatus.OFFERED);
        request.setVolunteer(volunteer);

        mockMvc.perform(post("/api/help-requests/10/accept").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.visibility").value("FULL"))
                .andExpect(jsonPath("$.viewerRole").value("REQUESTER"))
                .andExpect(jsonPath("$.volunteer.displayName").value("Kuba W."))
                .andExpect(jsonPath("$.volunteer.ratingCount").value(0));
    }

    @Test
    void qrIsShownToRequesterOnly() throws Exception {
        accepted();

        mockMvc.perform(get("/api/help-requests/10/qr").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestId").value(10))
                .andExpect(jsonPath("$.token").value(TOKEN))
                .andExpect(jsonPath("$.expiresAt").isString());

        mockMvc.perform(get("/api/help-requests/10/qr").header("X-User-Id", "9"))
                .andExpect(status().isForbidden());
    }

    @Test
    void handoffTokenNeverAppearsInRequestViews() throws Exception {
        accepted();

        String body = mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("FULL"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(TOKEN);
    }

    @Test
    void completeWithScannedToken() throws Exception {
        accepted();

        mockMvc.perform(post("/api/help-requests/10/complete")
                        .header("X-User-Id", "9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"" + TOKEN + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.viewerRole").value("VOLUNTEER"));
    }

    @Test
    void completeWithWrongTokenIs400() throws Exception {
        accepted();

        mockMvc.perform(post("/api/help-requests/10/complete")
                        .header("X-User-Id", "9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"wrong\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Invalid QR code"));
    }

    @Test
    void completeRequiresToken() throws Exception {
        accepted();

        mockMvc.perform(post("/api/help-requests/10/complete")
                        .header("X-User-Id", "9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.token").exists());
    }

    @Test
    void ratingReturns201WithUpdatedUser() throws Exception {
        accepted();
        request.setStatus(HelpRequestStatus.COMPLETED);

        mockMvc.perform(post("/api/help-requests/10/ratings")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stars\": 5, \"comment\": \"Dziękuję!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.ratedUser.id").value(9))
                .andExpect(jsonPath("$.ratedUser.ratingAverage").value(5.0))
                .andExpect(jsonPath("$.cityPointsAwarded").value(25));
    }

    @Test
    void ratingValidatesStars() throws Exception {
        mockMvc.perform(post("/api/help-requests/10/ratings")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stars\": 6}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.stars").exists());
    }

    @Test
    void mineIsNotMistakenForAnId() throws Exception {
        given(helpRequestRepository.findInvolving(requester)).willReturn(List.of(request));

        mockMvc.perform(get("/api/help-requests/mine").header("X-User-Id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].visibility").value("FULL"))
                .andExpect(jsonPath("$[0].viewerRole").value("REQUESTER"));
    }

    @Test
    void cancelOnMissingRequestIs404() throws Exception {
        given(helpRequestRepository.findByIdForUpdate(99L)).willReturn(Optional.empty());

        mockMvc.perform(post("/api/help-requests/99/cancel").header("X-User-Id", "1"))
                .andExpect(status().isNotFound());
    }

    private void accepted() {
        request.setStatus(HelpRequestStatus.ACCEPTED);
        request.setVolunteer(volunteer);
        request.setHandoffToken(TOKEN);
        request.setHandoffTokenExpiresAt(Instant.now().plusSeconds(3600));
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(request));
    }

    private HelpRequest storedRequest() {
        HelpRequest stored = new HelpRequest(
                requester,
                "Potrzebuję leków",
                "Skończyły mi się leki na serce.",
                HelpCategory.MEDICINE,
                1,
                GEOMETRY_FACTORY.createPoint(new Coordinate(19.9449, 50.0647)),
                "Długa",
                "1",
                null
        );
        stored.setId(10L);
        return stored;
    }

    private static AppUser user(long id, String name, UserRole role) {
        AppUser user = new AppUser(name, role, true, false, 50);
        user.setId(id);
        return user;
    }
}
