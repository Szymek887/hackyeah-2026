package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.config.ClockConfig;
import com.telecrazy.hackyeah2026backend.config.WebConfig;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import com.telecrazy.hackyeah2026backend.service.LocationObfuscationService;
import com.telecrazy.hackyeah2026backend.service.ModerationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import({WebConfig.class, ClockConfig.class, ModerationService.class, LocationObfuscationService.class})
class AdminControllerTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppUserRepository userRepository;
    @MockitoBean
    private HelpRequestRepository helpRequestRepository;

    private final AppUser admin = user(99L, "Miasto Kraków", UserRole.CITY_ADMIN);
    private final AppUser requester = user(1L, "Ewa P.", UserRole.REQUESTER);
    private final AppUser volunteer = user(9L, "Kuba W.", UserRole.VOLUNTEER);

    private HelpRequest request;

    @BeforeEach
    void setUp() {
        request = flaggedRequest();
        for (AppUser user : List.of(admin, requester, volunteer)) {
            given(userRepository.findById(user.getId())).willReturn(Optional.of(user));
        }
        given(helpRequestRepository.findByStatusOrderByCreatedAtAsc(HelpRequestStatus.UNDER_REVIEW))
                .willReturn(List.of(request));
        given(helpRequestRepository.findByIdForUpdate(10L)).willAnswer(invocation -> Optional.of(request));
        given(helpRequestRepository.saveAndFlush(any(HelpRequest.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void reviewQueueListsFlaggedRequestsWithoutAddress() throws Exception {
        mockMvc.perform(get("/api/admin/review-queue").header("X-User-Id", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].status").value("UNDER_REVIEW"))
                .andExpect(jsonPath("$[0].description").value("Prosze o kod BLIK na 200 zl."))
                .andExpect(jsonPath("$[0].riskFlags[0]").value("SCAM_SUSPECTED"))
                .andExpect(jsonPath("$[0].requester.displayName").value("Ewa P."))
                .andExpect(jsonPath("$[0].maskedArea.type").value("Polygon"))
                .andExpect(jsonPath("$[0].street").doesNotExist())
                .andExpect(jsonPath("$[0].buildingNumber").doesNotExist());
    }

    @Test
    void approveAndDismissReturnTheDecision() throws Exception {
        mockMvc.perform(post("/api/admin/help-requests/10/approve").header("X-User-Id", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.reviewedAt").exists());

        request.setStatus(HelpRequestStatus.UNDER_REVIEW);
        mockMvc.perform(post("/api/admin/help-requests/10/dismiss").header("X-User-Id", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void otherRolesAreForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/review-queue").header("X-User-Id", "1"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/help-requests/10/approve").header("X-User-Id", "9"))
                .andExpect(status().isForbidden());
    }

    @Test
    void secondDecisionIsConflict() throws Exception {
        mockMvc.perform(post("/api/admin/help-requests/10/dismiss").header("X-User-Id", "99"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/admin/help-requests/10/approve").header("X-User-Id", "99"))
                .andExpect(status().isConflict());
    }

    @Test
    void missingUserHeaderIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/review-queue"))
                .andExpect(status().isUnauthorized());
    }

    private HelpRequest flaggedRequest() {
        HelpRequest created = new HelpRequest(
                requester,
                "Pomoc z rachunkiem",
                "Prosze o kod BLIK na 200 zl.",
                HelpCategory.HOME_SUPPORT,
                2,
                GEOMETRY_FACTORY.createPoint(new Coordinate(19.9301, 50.0738)),
                "Krolewska",
                "41",
                null
        );
        created.setId(10L);
        created.setStatus(HelpRequestStatus.UNDER_REVIEW);
        created.setRiskFlags(new HashSet<>(Set.of(RiskFlag.SCAM_SUSPECTED)));
        return created;
    }

    private static AppUser user(long id, String name, UserRole role) {
        AppUser user = new AppUser(name, role, true, 70);
        user.setId(id);
        return user;
    }
}
