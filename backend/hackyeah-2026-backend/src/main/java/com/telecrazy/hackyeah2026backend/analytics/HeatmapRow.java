package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;

/**
 * Number of requests of one category inside one hexagon.
 *
 * @param i           hexagon column in the grid
 * @param j           hexagon row in the grid
 * @param areaGeoJson hexagon outline as a GeoJSON Polygon (WGS84)
 */
record HeatmapRow(
        long i,
        long j,
        double centerLng,
        double centerLat,
        String areaGeoJson,
        HelpCategory category,
        long count,
        long weight
) {
}
