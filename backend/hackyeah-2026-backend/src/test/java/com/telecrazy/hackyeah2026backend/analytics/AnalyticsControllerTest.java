package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.config.WebConfig;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
@Import({WebConfig.class, AnalyticsService.class})
class AnalyticsControllerTest {

    private static final long ADMIN_ID = 13L;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalyticsRepository repository;

    @MockitoBean
    private AppUserRepository userRepository;

    @BeforeEach
    void setUp() {
        given(userRepository.findById(ADMIN_ID)).willReturn(Optional.of(user(ADMIN_ID, UserRole.CITY_ADMIN)));
        given(userRepository.findById(9L)).willReturn(Optional.of(user(9L, UserRole.VOLUNTEER)));
        given(userRepository.findById(1L)).willReturn(Optional.of(user(1L, UserRole.REQUESTER)));
    }

    @Test
    void heatmapBindsFiltersAndReturnsGeoJson() throws Exception {
        given(repository.heatmap(any(), eq(500.0))).willReturn(List.of(new HeatmapRow(
                1, 1, 21.0, 52.2,
                "{\"type\":\"Polygon\",\"coordinates\":[[[21.0,52.2],[21.1,52.2],[21.0,52.3],[21.0,52.2]]]}",
                HelpCategory.MEDICINE, 3, 9, 2)));

        mockMvc.perform(get("/api/analytics/heatmap").header("X-User-Id", ADMIN_ID)
                        .param("category", "MEDICINE")
                        .param("status", "OPEN", "COMPLETED")
                        .param("from", "2026-10-01T00:00:00Z")
                        .param("to", "2026-10-05T00:00:00Z")
                        .param("cellSizeMeters", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("FeatureCollection"))
                .andExpect(jsonPath("$.cellSizeMeters").value(500))
                .andExpect(jsonPath("$.totalRequests").value(3))
                .andExpect(jsonPath("$.suppressedCells").value(0))
                .andExpect(jsonPath("$.features[0].type").value("Feature"))
                .andExpect(jsonPath("$.features[0].geometry.type").value("Point"))
                .andExpect(jsonPath("$.features[0].geometry.coordinates[0]").value(21.0))
                .andExpect(jsonPath("$.features[0].properties.count").value(3))
                .andExpect(jsonPath("$.features[0].properties.weight").value(9))
                .andExpect(jsonPath("$.features[0].properties.open").value(2))
                .andExpect(jsonPath("$.features[0].properties.byCategory.MEDICINE").value(3))
                .andExpect(jsonPath("$.features[0].properties.area.type").value("Polygon"));

        ArgumentCaptor<AnalyticsFilter> filter = ArgumentCaptor.forClass(AnalyticsFilter.class);
        verify(repository).heatmap(filter.capture(), eq(500.0));
        assertThat(filter.getValue().category()).isEqualTo(HelpCategory.MEDICINE);
        assertThat(filter.getValue().statuses())
                .containsExactlyInAnyOrder(HelpRequestStatus.OPEN, HelpRequestStatus.COMPLETED);
        assertThat(filter.getValue().from()).isEqualTo(Instant.parse("2026-10-01T00:00:00Z"));
        assertThat(filter.getValue().to()).isEqualTo(Instant.parse("2026-10-05T00:00:00Z"));
    }

    @Test
    void heatmapAcceptsCommaSeparatedStatuses() throws Exception {
        // The frontend sends `status=OFFERED,ACCEPTED`; it must bind like repeated `status` keys.
        mockMvc.perform(get("/api/analytics/heatmap")
                        .header("X-User-Id", ADMIN_ID)
                        .param("status", "OFFERED,ACCEPTED"))
                .andExpect(status().isOk());

        ArgumentCaptor<AnalyticsFilter> filter = ArgumentCaptor.forClass(AnalyticsFilter.class);
        verify(repository).heatmap(filter.capture(), any(Double.class));
        assertThat(filter.getValue().statuses())
                .containsExactlyInAnyOrder(HelpRequestStatus.OFFERED, HelpRequestStatus.ACCEPTED);
    }

    @Test
    void onlyCityAdminsSeeAnalytics() throws Exception {
        for (String path : List.of("/api/analytics/heatmap", "/api/analytics/summary")) {
            mockMvc.perform(get(path).header("X-User-Id", 9L)).andExpect(status().isForbidden());
            mockMvc.perform(get(path).header("X-User-Id", 1L)).andExpect(status().isForbidden());
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void summaryWorksWithoutFilters() throws Exception {
        given(repository.summary(any())).willReturn(List.of(
                new SummaryRow(HelpCategory.MEDICINE, HelpRequestStatus.OPEN, 1, 3)));

        mockMvc.perform(get("/api/analytics/summary").header("X-User-Id", ADMIN_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.open").value(3))
                .andExpect(jsonPath("$.openUrgent").value(3))
                .andExpect(jsonPath("$.byCategory.MEDICINE").value(3))
                .andExpect(jsonPath("$.byCategory.SOCIAL").value(0))
                .andExpect(jsonPath("$.byPriority.1").value(3));
    }

    @Test
    void rejectsInvalidParameters() throws Exception {
        mockMvc.perform(get("/api/analytics/heatmap").header("X-User-Id", ADMIN_ID).param("cellSizeMeters", "50"))
                .andExpect(status().isBadRequest());
        // Smaller than the public map's ~300 m location masking would locate requests too precisely.
        mockMvc.perform(get("/api/analytics/heatmap").header("X-User-Id", ADMIN_ID).param("cellSizeMeters", "100"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/analytics/heatmap").header("X-User-Id", ADMIN_ID).param("category", "PETS"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/analytics/summary").header("X-User-Id", ADMIN_ID).param("from", "yesterday"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/analytics/summary").header("X-User-Id", ADMIN_ID)
                        .param("from", "2026-10-05T00:00:00Z")
                        .param("to", "2026-10-01T00:00:00Z"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("'from' must be before 'to'"));
    }

    private static AppUser user(long id, UserRole role) {
        AppUser user = new AppUser("User " + id, role, true, 70);
        user.setId(id);
        return user;
    }
}
