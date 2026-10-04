package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.api.GeoJsonPoint;
import com.telecrazy.hackyeah2026backend.api.GeoJsonPolygon;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    public static final int DEFAULT_CELL_SIZE_METERS = 500;
    /**
     * Not smaller than the ~300 m area the public map masks locations to
     * ({@code LocationObfuscationService}), so the heatmap never locates a request more precisely.
     */
    static final int MIN_CELL_SIZE_METERS = 500;
    static final int MAX_CELL_SIZE_METERS = 5_000;

    /** Cancelled requests are not real deficits, so the heatmap leaves them out unless asked for. */
    static final Set<HelpRequestStatus> DEFAULT_HEATMAP_STATUSES = Set.of(
            HelpRequestStatus.OPEN,
            HelpRequestStatus.OFFERED,
            HelpRequestStatus.ACCEPTED,
            HelpRequestStatus.COMPLETED,
            HelpRequestStatus.RATED
    );

    private static final Set<HelpRequestStatus> IN_PROGRESS =
            Set.of(HelpRequestStatus.OFFERED, HelpRequestStatus.ACCEPTED);
    private static final Set<HelpRequestStatus> FULFILLED =
            Set.of(HelpRequestStatus.COMPLETED, HelpRequestStatus.RATED);

    private final AnalyticsRepository repository;
    private final JsonMapper jsonMapper;
    /**
     * k-anonymity threshold: hexagons with fewer requests are left out of the heatmap, so a filter
     * (e.g. one category) cannot single out one person's request.
     */
    private final int minCellCount;

    public AnalyticsService(
            AnalyticsRepository repository,
            JsonMapper jsonMapper,
            @Value("${app.analytics.min-cell-count:3}") int minCellCount
    ) {
        if (minCellCount < 1) {
            throw new IllegalArgumentException("app.analytics.min-cell-count must be at least 1");
        }
        this.repository = repository;
        this.jsonMapper = jsonMapper;
        this.minCellCount = minCellCount;
    }

    public HeatmapResponse heatmap(AnalyticsFilter filter, int cellSizeMeters) {
        if (cellSizeMeters < MIN_CELL_SIZE_METERS || cellSizeMeters > MAX_CELL_SIZE_METERS) {
            throw new IllegalArgumentException("cellSizeMeters must be between %d and %d"
                    .formatted(MIN_CELL_SIZE_METERS, MAX_CELL_SIZE_METERS));
        }
        Set<HelpRequestStatus> statuses = filter.statuses().isEmpty()
                ? DEFAULT_HEATMAP_STATUSES
                : filter.statuses().stream()
                .filter(status -> !status.isHiddenFromPublic())
                .collect(Collectors.toUnmodifiableSet());
        if (statuses.isEmpty()) {
            return HeatmapResponse.of(cellSizeMeters, List.of(), 0);
        }
        filter = new AnalyticsFilter(filter.category(), statuses, filter.from(), filter.to());
        List<HeatmapResponse.Feature> features = toFeatures(repository.heatmap(filter, cellSizeMeters));
        // Applied after all filters: the threshold holds for exactly what the caller gets back.
        List<HeatmapResponse.Feature> visible = features.stream()
                .filter(feature -> feature.properties().count() >= minCellCount)
                .toList();
        return HeatmapResponse.of(cellSizeMeters, visible, features.size() - visible.size());
    }

    public SummaryResponse summary(AnalyticsFilter filter) {
        return toSummary(repository.summary(filter));
    }

    /** Merges per-category rows of the same hexagon into one feature. Rows must be ordered by hexagon. */
    List<HeatmapResponse.Feature> toFeatures(List<HeatmapRow> rows) {
        Map<String, List<HeatmapRow>> rowsByHexagon = new LinkedHashMap<>();
        for (HeatmapRow row : rows) {
            rowsByHexagon.computeIfAbsent(row.i() + ":" + row.j(), key -> new ArrayList<>()).add(row);
        }

        List<HeatmapResponse.Feature> features = new ArrayList<>();
        for (List<HeatmapRow> hexagonRows : rowsByHexagon.values()) {
            HeatmapRow first = hexagonRows.getFirst();
            Map<HelpCategory, Long> byCategory = zeroCounts(HelpCategory.class);
            long count = 0;
            long weight = 0;
            for (HeatmapRow row : hexagonRows) {
                byCategory.merge(row.category(), row.count(), Long::sum);
                count += row.count();
                weight += row.weight();
            }
            features.add(HeatmapResponse.Feature.of(
                    GeoJsonPoint.of(first.centerLng(), first.centerLat()),
                    new HeatmapResponse.Properties(
                            count,
                            weight,
                            byCategory,
                            jsonMapper.readValue(first.areaGeoJson(), GeoJsonPolygon.class))
            ));
        }
        return features;
    }

    static SummaryResponse toSummary(List<SummaryRow> rows) {
        Map<HelpRequestStatus, Long> byStatus = zeroCounts(HelpRequestStatus.class);
        byStatus.keySet().removeAll(HelpRequestStatus.HIDDEN_FROM_PUBLIC);
        Map<HelpCategory, Long> byCategory = zeroCounts(HelpCategory.class);
        Map<Integer, Long> byPriority = new TreeMap<>(Map.of(0, 0L, 1, 0L, 2, 0L, 3, 0L));
        long total = 0;

        for (SummaryRow row : rows) {
            if (row.status().isHiddenFromPublic()) {
                continue;
            }
            byStatus.merge(row.status(), row.count(), Long::sum);
            byCategory.merge(row.category(), row.count(), Long::sum);
            byPriority.merge(row.priority(), row.count(), Long::sum);
            total += row.count();
        }

        long inProgress = sum(byStatus, IN_PROGRESS);
        long fulfilled = sum(byStatus, FULFILLED);
        long cancelled = byStatus.get(HelpRequestStatus.CANCELLED);
        long fulfillable = total - cancelled;
        double fulfillmentRate = fulfillable == 0 ? 0 : (double) fulfilled / fulfillable;

        return new SummaryResponse(
                total,
                byStatus.get(HelpRequestStatus.OPEN),
                inProgress,
                fulfilled,
                cancelled,
                fulfillmentRate,
                byStatus,
                byCategory,
                byPriority
        );
    }

    private static <E extends Enum<E>> Map<E, Long> zeroCounts(Class<E> type) {
        Map<E, Long> counts = new EnumMap<>(type);
        for (E value : type.getEnumConstants()) {
            counts.put(value, 0L);
        }
        return counts;
    }

    private static long sum(Map<HelpRequestStatus, Long> byStatus, Set<HelpRequestStatus> statuses) {
        return statuses.stream().mapToLong(byStatus::get).sum();
    }
}
