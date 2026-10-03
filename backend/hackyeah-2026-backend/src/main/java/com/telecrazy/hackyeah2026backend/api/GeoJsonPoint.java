package com.telecrazy.hackyeah2026backend.api;

public record GeoJsonPoint(String type, double[] coordinates) {

    public static GeoJsonPoint of(double lng, double lat) {
        return new GeoJsonPoint("Point", new double[]{lng, lat});
    }
}
