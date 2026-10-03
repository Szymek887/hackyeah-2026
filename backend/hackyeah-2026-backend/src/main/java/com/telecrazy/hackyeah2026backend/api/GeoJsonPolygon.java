package com.telecrazy.hackyeah2026backend.api;

import java.util.List;

public record GeoJsonPolygon(String type, List<List<double[]>> coordinates) {

    public static GeoJsonPolygon of(List<double[]> ring) {
        return new GeoJsonPolygon("Polygon", List.of(ring));
    }
}
