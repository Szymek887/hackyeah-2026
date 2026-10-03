package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.GeoJsonPoint;
import com.telecrazy.hackyeah2026backend.api.GeoJsonPolygon;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationObfuscationService {

    private static final double CELL_SIZE_METERS = 300.0;
    private static final double METERS_PER_LATITUDE_DEGREE = 111_320.0;

    public GeoJsonPoint approximate(Point point) {
        MaskedCell cell = maskedCell(point);
        return GeoJsonPoint.of(cell.centerLng(), cell.centerLat());
    }

    public GeoJsonPolygon maskedArea(Point point) {
        MaskedCell cell = maskedCell(point);
        List<double[]> ring = List.of(
                new double[]{cell.westLng(), cell.southLat()},
                new double[]{cell.eastLng(), cell.southLat()},
                new double[]{cell.eastLng(), cell.northLat()},
                new double[]{cell.westLng(), cell.northLat()},
                new double[]{cell.westLng(), cell.southLat()}
        );
        return GeoJsonPolygon.of(ring);
    }

    private MaskedCell maskedCell(Point point) {
        double latSize = CELL_SIZE_METERS / METERS_PER_LATITUDE_DEGREE;
        double lngSize = CELL_SIZE_METERS / metersPerLongitudeDegree(point.getY());

        double southLat = Math.floor(point.getY() / latSize) * latSize;
        double westLng = Math.floor(point.getX() / lngSize) * lngSize;
        double northLat = southLat + latSize;
        double eastLng = westLng + lngSize;

        return new MaskedCell(
                westLng,
                eastLng,
                southLat,
                northLat,
                westLng + lngSize / 2,
                southLat + latSize / 2
        );
    }

    private double metersPerLongitudeDegree(double lat) {
        double latitudeRadians = Math.toRadians(lat);
        double value = METERS_PER_LATITUDE_DEGREE * Math.cos(latitudeRadians);
        return Math.max(value, 1.0);
    }

    private record MaskedCell(
            double westLng,
            double eastLng,
            double southLat,
            double northLat,
            double centerLng,
            double centerLat
    ) {
    }
}
