package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.RequestClassification;
import com.telecrazy.hackyeah2026backend.ai.RequestClassificationService;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.config.WebConfig;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import com.telecrazy.hackyeah2026backend.service.HelpRequestDetailsService;
import com.telecrazy.hackyeah2026backend.service.HelpRequestService;
import com.telecrazy.hackyeah2026backend.service.HelpRequestViewMapper;
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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HelpRequestController.class)
@Import({
        WebConfig.class,
        HelpRequestService.class,
        HelpRequestDetailsService.class,
        HelpRequestViewMapper.class,
        LocationObfuscationService.class
})
class HelpRequestControllerTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    // Distinctive values, so the leak test can search the raw response body for them.
    private static final String STREET = "Tajemnicza";
    private static final String BUILDING = "77B";
    private static final String APARTMENT = "13A";
    private static final String REQUESTER_NAME = "Anna Tajna";
    private static final double EXACT_LNG = 19.944912;
    private static final double EXACT_LAT = 50.064734;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppUserRepository userRepository;
    @MockitoBean
    private HelpRequestRepository helpRequestRepository;
    @MockitoBean
    private RequestClassificationService classificationService;

    private final AppUser requester = user(1L, REQUESTER_NAME, UserRole.REQUESTER);
    private final AppUser volunteer = user(4L, "Kuba W.", UserRole.VOLUNTEER);
    private final AppUser stranger = user(6L, "Ola N.", UserRole.VOLUNTEER);

    @BeforeEach
    void setUp() {
        for (AppUser user : List.of(requester, volunteer, stranger)) {
            given(userRepository.findById(user.getId())).willReturn(Optional.of(user));
        }
    }

    @Test
    void publicDetailsNeverLeakAddressExactLocationOrRequester() throws Exception {
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(storedRequest(HelpRequestStatus.OPEN)));

        String body = mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
                .andExpect(jsonPath("$.maskedArea.type").value("Polygon"))
                .andExpect(jsonPath("$.approximateLocation.type").value("Point"))
                .andExpect(jsonPath("$.street").doesNotExist())
                .andExpect(jsonPath("$.buildingNumber").doesNotExist())
                .andExpect(jsonPath("$.apartmentNumber").doesNotExist())
                .andExpect(jsonPath("$.location").doesNotExist())
                .andExpect(jsonPath("$.requester").doesNotExist())
                .andExpect(jsonPath("$.volunteer").doesNotExist())
                .andExpect(jsonPath("$.riskFlags").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(STREET, BUILDING, APARTMENT, REQUESTER_NAME,
                String.valueOf(EXACT_LNG), String.valueOf(EXACT_LAT));
    }

    @Test
    void personalDataInTitleAndDescriptionIsWithheldFromPublicDetails() throws Exception {
        HelpRequest request = storedRequest(HelpRequestStatus.OPEN);
        request.setTitle("Leki dla Anny Tajnej, tel. 600100200");
        request.setRiskFlags(Set.of(RiskFlag.PERSONAL_DATA));
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(request));

        String body = mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Prośba o pomoc z lekami"))
                .andExpect(jsonPath("$.description").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("600100200", "Tajnej");
    }

    @Test
    void nearbyListNeverLeaksAddressExactLocationOrPersonalData() throws Exception {
        HelpRequest withPersonalData = storedRequest(HelpRequestStatus.OPEN);
        withPersonalData.setTitle("Leki dla Anny Tajnej, tel. 600100200");
        withPersonalData.setRiskFlags(Set.of(RiskFlag.PERSONAL_DATA));
        given(helpRequestRepository.findOpenWithinRadius(EXACT_LAT, EXACT_LNG, 3000))
                .willReturn(List.of(withPersonalData));

        String body = mockMvc.perform(get("/api/help-requests/nearby")
                        .param("lat", String.valueOf(EXACT_LAT))
                        .param("lng", String.valueOf(EXACT_LNG)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Prośba o pomoc z lekami"))
                .andExpect(jsonPath("$[0].maskedArea.type").value("Polygon"))
                .andExpect(jsonPath("$[0].street").doesNotExist())
                .andExpect(jsonPath("$[0].location").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(STREET, BUILDING, APARTMENT, REQUESTER_NAME, "600100200",
                String.valueOf(EXACT_LNG), String.valueOf(EXACT_LAT));
    }

    @Test
    void volunteerSeesOnlyPublicDetailsBeforeAcceptance() throws Exception {
        HelpRequest request = storedRequest(HelpRequestStatus.OFFERED);
        request.setVolunteer(volunteer);
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(request));

        mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
                .andExpect(jsonPath("$.street").doesNotExist());
    }

    @Test
    void assignedVolunteerLearnsAboutSpecialNeedsOnlyWithConsent() throws Exception {
        requester.setSpecialNeeds(true);
        HelpRequest request = storedRequest(HelpRequestStatus.ACCEPTED);
        request.setVolunteer(volunteer);
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(request));

        mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("FULL"))
                .andExpect(jsonPath("$.requesterSpecialNeeds").value(false));

        requester.updateSpecialNeedsConsent(true, Instant.parse("2026-10-03T12:00:00Z"));

        mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requesterSpecialNeeds").value(true));
    }

    @Test
    void consentWithoutSpecialNeedsRevealsNothing() throws Exception {
        requester.updateSpecialNeedsConsent(true, Instant.parse("2026-10-03T12:00:00Z"));
        HelpRequest request = storedRequest(HelpRequestStatus.ACCEPTED);
        request.setVolunteer(volunteer);
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(request));

        mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "4"))
                .andExpect(jsonPath("$.requesterSpecialNeeds").value(false));
    }

    @Test
    void specialNeedsNeverReachPublicViewsOrVolunteerBeforeAcceptance() throws Exception {
        requester.setSpecialNeeds(true);
        requester.updateSpecialNeedsConsent(true, Instant.parse("2026-10-03T12:00:00Z"));
        HelpRequest offered = storedRequest(HelpRequestStatus.OFFERED);
        offered.setVolunteer(volunteer);
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(offered));
        given(helpRequestRepository.findOpenWithinRadius(EXACT_LAT, EXACT_LNG, 3000))
                .willReturn(List.of(storedRequest(HelpRequestStatus.OPEN)));

        String volunteerBeforeAcceptance = mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "4"))
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
                .andReturn().getResponse().getContentAsString();
        String stranger = mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "6"))
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
                .andReturn().getResponse().getContentAsString();
        String nearby = mockMvc.perform(get("/api/help-requests/nearby")
                        .param("lat", String.valueOf(EXACT_LAT))
                        .param("lng", String.valueOf(EXACT_LNG)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        for (String body : List.of(volunteerBeforeAcceptance, stranger, nearby)) {
            assertThat(body).doesNotContainIgnoringCase("specialNeeds");
        }
    }

    @Test
    void assignedVolunteerSeesAddressAfterAcceptance() throws Exception {
        HelpRequest request = storedRequest(HelpRequestStatus.ACCEPTED);
        request.setVolunteer(volunteer);
        given(helpRequestRepository.findById(10L)).willReturn(Optional.of(request));

        mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("FULL"))
                .andExpect(jsonPath("$.street").value(STREET))
                .andExpect(jsonPath("$.apartmentNumber").value(APARTMENT))
                .andExpect(jsonPath("$.location.coordinates[0]").value(EXACT_LNG))
                .andExpect(jsonPath("$.requester.displayName").value(REQUESTER_NAME))
                .andExpect(jsonPath("$.volunteer.id").value(4));
    }

    @Test
    void requestUnderReviewReturns404ForOthers() throws Exception {
        given(helpRequestRepository.findById(10L))
                .willReturn(Optional.of(storedRequest(HelpRequestStatus.UNDER_REVIEW)));

        mockMvc.perform(get("/api/help-requests/10").header("X-User-Id", "6"))
                .andExpect(status().isNotFound());
    }

    @Test
    void detailsRequireUserHeader() throws Exception {
        mockMvc.perform(get("/api/help-requests/10"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createReturns201WithLocationAndFullDetails() throws Exception {
        given(classificationService.classify(any())).willReturn(new RequestClassification(
                HelpCategory.MEDICINE, 1, List.of("leki"), Set.of(), ClassificationSource.FALLBACK
        ));
        given(helpRequestRepository.save(any(HelpRequest.class))).willAnswer(invocation -> {
            HelpRequest saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        mockMvc.perform(post("/api/help-requests")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Potrzebuję leków",
                                  "description": "Skończyły mi się leki na serce, nie mam jak wyjść z domu.",
                                  "lat": 50.064734,
                                  "lng": 19.944912,
                                  "street": "Tajemnicza",
                                  "buildingNumber": "77B",
                                  "apartmentNumber": "13A"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/help-requests/100"))
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.visibility").value("FULL"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.category").value("MEDICINE"))
                .andExpect(jsonPath("$.priority").value(1))
                .andExpect(jsonPath("$.classificationSource").value("FALLBACK"))
                .andExpect(jsonPath("$.tags[0]").value("leki"))
                .andExpect(jsonPath("$.location.coordinates[1]").value(EXACT_LAT))
                .andExpect(jsonPath("$.requester.id").value(1));
    }

    @Test
    void createValidatesBody() throws Exception {
        mockMvc.perform(post("/api/help-requests")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "", "description": "x", "lat": 95, "street": "Długa", "buildingNumber": "1" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors.lat").exists())
                .andExpect(jsonPath("$.errors.lng").exists());
    }

    private HelpRequest storedRequest(HelpRequestStatus status) {
        HelpRequest request = new HelpRequest(
                requester,
                "Potrzebuję leków",
                "Skończyły mi się leki na serce.",
                HelpCategory.MEDICINE,
                1,
                GEOMETRY_FACTORY.createPoint(new Coordinate(EXACT_LNG, EXACT_LAT)),
                STREET,
                BUILDING,
                APARTMENT
        );
        request.setId(10L);
        request.setStatus(status);
        return request;
    }

    private static AppUser user(long id, String name, UserRole role) {
        AppUser user = new AppUser(name, role, true, false, 50);
        user.setId(id);
        return user;
    }
}
