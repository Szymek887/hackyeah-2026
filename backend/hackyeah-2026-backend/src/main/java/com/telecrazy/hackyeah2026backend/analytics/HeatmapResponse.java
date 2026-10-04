package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.api.GeoJsonPoint;
import com.telecrazy.hackyeah2026backend.api.GeoJsonPolygon;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

import java.util.List;
import java.util.Map;

/**
 * GeoJSON FeatureCollection with one Point feature per hexagon that has enough requests to be shown
 * (see {@code app.analytics.min-cell-count}).
 * The point is the hexagon centre (for heatmap layers weighted by {@code count} or {@code weight});
 * {@code properties.area} is the hexagon outline (for hexbin/choropleth layers).
 */
public record HeatmapResponse(
        String type,
        int cellSizeMeters,
        long totalRequests,
        int suppressedCells,
        List<Feature> features
) {

    /**
     * @param suppressedCells hexagons left out because they have too few requests; their requests
     *                        are not included in {@code totalRequests}
     */
    public static HeatmapResponse of(int cellSizeMeters, List<Feature> features, int suppressedCells) {
        long total = features.stream().mapToLong(feature -> feature.properties().count()).sum();
        return new HeatmapResponse("FeatureCollection", cellSizeMeters, total, suppressedCells, features);
    }

    public record Feature(String type, GeoJsonPoint geometry, Properties properties) {

        public static Feature of(GeoJsonPoint geometry, Properties properties) {
            return new Feature("Feature", geometry, properties);
        }
    }

    /**
     * @param count      number of requests in the hexagon
     * @param weight     priority-weighted count: priority 0 (medicine) counts 4, priority 1 counts 3, priority 2 counts 2, priority 3 counts 1
     * @param byCategory number of requests per category (every category present, zero if none)
     */
    public record Properties(
            long count,
            long weight,
            Map<HelpCategory, Long> byCategory,
            GeoJsonPolygon area
    ) {
    }
}
