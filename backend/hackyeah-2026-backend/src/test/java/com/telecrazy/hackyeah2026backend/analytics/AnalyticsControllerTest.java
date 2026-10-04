package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
@Import(AnalyticsService.class)
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalyticsRepository repository;

    @MockitoBean
    private AppUserRepository userRepository;

    @Test
    void heatmapBindsFiltersAndReturnsGeoJson() throws Exception {
        given(repository.heatmap(any(), eq(500.0))).willReturn(List.of(new HeatmapRow(
                1, 1, 21.0, 52.2,
                "{\"type\":\"Polygon\",\"coordinates\":[[[21.0,52.2],[21.1,52.2],[21.0,52.3],[21.0,52.2]]]}",
                HelpCategory.MEDICINE, 3, 9, 2)));

        mockMvc.perform(get("/api/analytics/heatmap")
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
    void summaryWorksWithoutFilters() throws Exception {
        given(repository.summary(any())).willReturn(List.of(
                new SummaryRow(HelpCategory.MEDICINE, HelpRequestStatus.OPEN, 1, 3)));

        mockMvc.perform(get("/api/analytics/summary"))
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
        mockMvc.perform(get("/api/analytics/heatmap").param("cellSizeMeters", "50"))
                .andExpect(status().isBadRequest());
        // Smaller than the public map's ~300 m location masking would locate requests too precisely.
        mockMvc.perform(get("/api/analytics/heatmap").param("cellSizeMeters", "100"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/analytics/heatmap").param("category", "PETS"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/analytics/summary").param("from", "yesterday"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/analytics/summary")
                        .param("from", "2026-10-05T00:00:00Z")
                        .param("to", "2026-10-01T00:00:00Z"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("'from' must be before 'to'"));
    }
}
