package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.GeoJsonPoint;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class LocationObfuscationService {

    private static final int APPROXIMATION_SCALE = 3;

    public GeoJsonPoint approximate(Point point) {
        double lng = round(point.getX());
        double lat = round(point.getY());
        return GeoJsonPoint.of(lng, lat);
    }

    private double round(double value) {
        return BigDecimal.valueOf(value)
                .setScale(APPROXIMATION_SCALE, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
