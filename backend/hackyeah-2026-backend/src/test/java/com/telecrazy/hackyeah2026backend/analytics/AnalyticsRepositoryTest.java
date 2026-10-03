package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;

/**
 * Runs the analytics SQL against the development PostGIS database (docker compose).
 * Test data is dated in 2030 and filtered by that window, so seeded data does not interfere;
 * every test rolls back.
 */
@SpringBootTest
@Transactional
class AnalyticsRepositoryTest {

    private static final Instant WINDOW_START = Instant.parse("2030-01-01T00:00:00Z");
    private static final Instant WINDOW_END = Instant.parse("2030-01-02T00:00:00Z");
    private static final AnalyticsFilter IN_WINDOW = new AnalyticsFilter(null, null, WINDOW_START, WINDOW_END);

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private HelpRequestRepository helpRequestRepository;

    private AppUser requester;

    @BeforeEach
    void setUp() {
        requester = userRepository.save(new AppUser("Test", UserRole.REQUESTER, true, false, 50));

        // Old Town cluster: three active requests and one cancelled at the same spot.
        save(HelpCategory.MEDICINE, 1, HelpRequestStatus.OPEN, 19.9373, 50.0614);
        save(HelpCategory.MEDICINE, 1, HelpRequestStatus.ACCEPTED, 19.9373, 50.0614);
        save(HelpCategory.GROCERIES, 3, HelpRequestStatus.COMPLETED, 19.9373, 50.0614);
        save(HelpCategory.GROCERIES, 2, HelpRequestStatus.CANCELLED, 19.9373, 50.0614);
        // Nowa Huta, about 8 km east.
        save(HelpCategory.SOCIAL, 2, HelpRequestStatus.OPEN, 20.0372, 50.0717);
    }

    @Test
    void groupsRequestsIntoHexagons() {
        HeatmapResponse heatmap = analyticsService.heatmap(IN_WINDOW, 500);

        assertThat(heatmap.totalRequests()).isEqualTo(4);
        assertThat(heatmap.features()).hasSize(2);

        List<HeatmapResponse.Feature> byCount = heatmap.features().stream()
                .sorted(Comparator.comparingLong(f -> -f.properties().count()))
                .toList();

        HeatmapResponse.Properties oldTown = byCount.getFirst().properties();
        assertThat(oldTown.count()).isEqualTo(3);
        assertThat(oldTown.weight()).isEqualTo(3 + 3 + 1);
        assertThat(oldTown.byCategory())
                .containsEntry(HelpCategory.MEDICINE, 2L)
                .containsEntry(HelpCategory.GROCERIES, 1L);

        double[] center = byCount.getFirst().geometry().coordinates();
        assertThat(center[0]).isCloseTo(19.9373, offset(0.01));
        assertThat(center[1]).isCloseTo(50.0614, offset(0.01));

        List<double[]> ring = oldTown.area().coordinates().getFirst();
        assertThat(ring).hasSize(7); // hexagon: 6 corners + closing point
    }

    @Test
    void filtersByCategoryAndStatus() {
        AnalyticsFilter medicineOnly = new AnalyticsFilter(HelpCategory.MEDICINE, null, WINDOW_START, WINDOW_END);
        assertThat(analyticsService.heatmap(medicineOnly, 500).totalRequests()).isEqualTo(2);

        AnalyticsFilter cancelledOnly = new AnalyticsFilter(
                null, Set.of(HelpRequestStatus.CANCELLED), WINDOW_START, WINDOW_END);
        assertThat(analyticsService.heatmap(cancelledOnly, 500).totalRequests()).isEqualTo(1);
    }

    @Test
    void largerCellsMergeDistantRequests() {
        assertThat(analyticsService.heatmap(IN_WINDOW, 5_000).features()).hasSize(1);
    }

    @Test
    void summarizesRequests() {
        SummaryResponse summary = analyticsService.summary(IN_WINDOW);

        assertThat(summary.total()).isEqualTo(5);
        assertThat(summary.open()).isEqualTo(2);
        assertThat(summary.inProgress()).isEqualTo(1);
        assertThat(summary.fulfilled()).isEqualTo(1);
        assertThat(summary.cancelled()).isEqualTo(1);
        assertThat(summary.fulfillmentRate()).isEqualTo(0.25);
        assertThat(summary.byCategory()).containsEntry(HelpCategory.GROCERIES, 2L);
        assertThat(summary.byPriority()).containsEntry(1, 2L).containsEntry(2, 2L).containsEntry(3, 1L);
    }

    private void save(HelpCategory category, int priority, HelpRequestStatus status, double lng, double lat) {
        HelpRequest request = new HelpRequest(
                requester, "Test", "Test", category, priority,
                geometryFactory.createPoint(new Coordinate(lng, lat)), "Testowa", "1", null);
        request.setStatus(status);
        request.setCreatedAt(WINDOW_START.plusSeconds(60));
        helpRequestRepository.saveAndFlush(request);
    }
}
