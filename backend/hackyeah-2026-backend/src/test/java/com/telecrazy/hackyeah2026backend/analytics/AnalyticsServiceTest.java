package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AnalyticsServiceTest {

    private static final String HEXAGON = """
            {"type":"Polygon","coordinates":[[[21.0,52.2],[21.01,52.2],[21.01,52.21],[21.0,52.2]]]}""";
    private static final AnalyticsFilter NO_FILTER = new AnalyticsFilter(null, null, null, null);

    private final AnalyticsRepository repository = mock(AnalyticsRepository.class);
    private final AnalyticsService service = new AnalyticsService(repository, JsonMapper.builder().build());

    @Test
    void mergesCategoryRowsOfSameHexagonIntoOneFeature() {
        given(repository.heatmap(any(), anyDouble())).willReturn(List.of(
                new HeatmapRow(1, 1, 21.005, 52.205, HEXAGON, HelpCategory.MEDICINE, 2, 6),
                new HeatmapRow(1, 1, 21.005, 52.205, HEXAGON, HelpCategory.SOCIAL, 1, 1),
                new HeatmapRow(1, 2, 21.015, 52.215, HEXAGON, HelpCategory.GROCERIES, 4, 8)
        ));

        HeatmapResponse response = service.heatmap(NO_FILTER, 500);

        assertThat(response.type()).isEqualTo("FeatureCollection");
        assertThat(response.totalRequests()).isEqualTo(7);
        assertThat(response.features()).hasSize(2);

        HeatmapResponse.Feature first = response.features().getFirst();
        assertThat(first.geometry().coordinates()).containsExactly(21.005, 52.205);
        assertThat(first.properties().count()).isEqualTo(3);
        assertThat(first.properties().weight()).isEqualTo(7);
        assertThat(first.properties().byCategory())
                .containsEntry(HelpCategory.MEDICINE, 2L)
                .containsEntry(HelpCategory.SOCIAL, 1L)
                .containsEntry(HelpCategory.GROCERIES, 0L)
                .hasSize(HelpCategory.values().length);
        assertThat(first.properties().area().type()).isEqualTo("Polygon");
        assertThat(first.properties().area().coordinates().getFirst()).hasSize(4);
    }

    @Test
    void heatmapLeavesOutCancelledByDefault() {
        service.heatmap(NO_FILTER, 500);

        ArgumentCaptor<AnalyticsFilter> filter = ArgumentCaptor.forClass(AnalyticsFilter.class);
        verify(repository).heatmap(filter.capture(), any(Double.class));
        assertThat(filter.getValue().statuses())
                .doesNotContain(HelpRequestStatus.CANCELLED)
                .doesNotContain(HelpRequestStatus.UNDER_REVIEW)
                .contains(HelpRequestStatus.OPEN, HelpRequestStatus.COMPLETED);
    }

    @Test
    void heatmapKeepsExplicitStatuses() {
        service.heatmap(new AnalyticsFilter(null, Set.of(HelpRequestStatus.CANCELLED), null, null), 500);

        ArgumentCaptor<AnalyticsFilter> filter = ArgumentCaptor.forClass(AnalyticsFilter.class);
        verify(repository).heatmap(filter.capture(), any(Double.class));
        assertThat(filter.getValue().statuses()).containsExactly(HelpRequestStatus.CANCELLED);
    }

    @Test
    void heatmapDropsUnderReviewFromExplicitStatuses() {
        service.heatmap(new AnalyticsFilter(null, Set.of(HelpRequestStatus.OPEN, HelpRequestStatus.UNDER_REVIEW), null, null), 500);

        ArgumentCaptor<AnalyticsFilter> filter = ArgumentCaptor.forClass(AnalyticsFilter.class);
        verify(repository).heatmap(filter.capture(), any(Double.class));
        assertThat(filter.getValue().statuses()).containsExactly(HelpRequestStatus.OPEN);
    }

    @Test
    void heatmapReturnsEmptyWhenOnlyUnderReviewRequested() {
        HeatmapResponse response = service.heatmap(
                new AnalyticsFilter(null, Set.of(HelpRequestStatus.UNDER_REVIEW), null, null),
                500
        );

        assertThat(response.totalRequests()).isZero();
        assertThat(response.features()).isEmpty();
    }

    @Test
    void rejectsCellSizeOutOfRange() {
        assertThatThrownBy(() -> service.heatmap(NO_FILTER, 99)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.heatmap(NO_FILTER, 5001)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsFromNotBeforeTo() {
        Instant now = Instant.now();
        assertThatThrownBy(() -> new AnalyticsFilter(null, null, now, now))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void summaryCountsEveryKeyAndDerivedTotals() {
        SummaryResponse summary = AnalyticsService.toSummary(List.of(
                new SummaryRow(HelpCategory.MEDICINE, HelpRequestStatus.OPEN, 1, 3),
                new SummaryRow(HelpCategory.MEDICINE, HelpRequestStatus.ACCEPTED, 1, 1),
                new SummaryRow(HelpCategory.GROCERIES, HelpRequestStatus.COMPLETED, 2, 2),
                new SummaryRow(HelpCategory.SOCIAL, HelpRequestStatus.RATED, 3, 2),
                new SummaryRow(HelpCategory.SOCIAL, HelpRequestStatus.CANCELLED, 3, 2)
        ));

        assertThat(summary.total()).isEqualTo(10);
        assertThat(summary.open()).isEqualTo(3);
        assertThat(summary.inProgress()).isEqualTo(1);
        assertThat(summary.fulfilled()).isEqualTo(4);
        assertThat(summary.cancelled()).isEqualTo(2);
        assertThat(summary.fulfillmentRate()).isEqualTo(0.5);
        assertThat(summary.byStatus())
                .hasSize(HelpRequestStatus.values().length - HelpRequestStatus.HIDDEN_FROM_PUBLIC.size())
                .containsEntry(HelpRequestStatus.OFFERED, 0L);
        assertThat(summary.byCategory()).hasSize(HelpCategory.values().length)
                .containsEntry(HelpCategory.MEDICINE, 4L)
                .containsEntry(HelpCategory.EQUIPMENT_LOAN, 0L);
        assertThat(summary.byPriority()).containsEntry(1, 4L).containsEntry(2, 2L).containsEntry(3, 4L);
    }

    @Test
    void summaryNeverExposesRequestsHiddenFromPublic() {
        SummaryResponse summary = AnalyticsService.toSummary(List.of(
                new SummaryRow(HelpCategory.GROCERIES, HelpRequestStatus.COMPLETED, 2, 1),
                new SummaryRow(HelpCategory.GROCERIES, HelpRequestStatus.UNDER_REVIEW, 3, 5)
        ));

        assertThat(summary.total()).isEqualTo(1);
        assertThat(summary.fulfillmentRate()).isEqualTo(1.0);
        assertThat(summary.byStatus()).doesNotContainKey(HelpRequestStatus.UNDER_REVIEW);
        assertThat(summary.byCategory()).containsEntry(HelpCategory.GROCERIES, 1L);
    }

    @Test
    void emptySummaryHasZeroRate() {
        SummaryResponse summary = AnalyticsService.toSummary(List.of());

        assertThat(summary.total()).isZero();
        assertThat(summary.fulfillmentRate()).isZero();
        assertThat(summary.byPriority()).containsEntry(0, 0L).containsEntry(1, 0L);
    }
}
