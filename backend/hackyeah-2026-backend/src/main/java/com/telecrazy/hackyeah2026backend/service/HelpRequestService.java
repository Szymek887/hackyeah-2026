package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.PublicHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.api.RoutePoint;
import com.telecrazy.hackyeah2026backend.api.RouteSearchRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.List;

@Service
public class HelpRequestService {

    private static final int MIN_ROUTE_POINTS = 2;
    private static final int MAX_ROUTE_POINTS = 100;
    private static final double MIN_ROUTE_BUFFER_METERS = 50;
    private static final double MAX_ROUTE_BUFFER_METERS = 2_000;

    private final HelpRequestRepository helpRequestRepository;
    private final LocationObfuscationService locationObfuscationService;

    public HelpRequestService(
            HelpRequestRepository helpRequestRepository,
            LocationObfuscationService locationObfuscationService
    ) {
        this.helpRequestRepository = helpRequestRepository;
        this.locationObfuscationService = locationObfuscationService;
    }

    public List<PublicHelpRequestResponse> findNearby(double lat, double lng, double radiusKm) {
        validateCoordinates(lat, lng);
        if (radiusKm <= 0 || radiusKm > 25) {
            throw new IllegalArgumentException("radiusKm must be between 0 and 25");
        }

        return helpRequestRepository.findOpenWithinRadius(lat, lng, radiusKm * 1000)
                .stream()
                .map(this::toPublicResponse)
                .toList();
    }

    public List<PublicHelpRequestResponse> findAlongRoute(RouteSearchRequest request) {
        validateRouteRequest(request);

        return helpRequestRepository.findOpenAlongRoute(toLineStringWkt(request.points()), request.bufferMeters())
                .stream()
                .map(this::toPublicResponse)
                .toList();
    }

    String toLineStringWkt(List<RoutePoint> points) {
        String coordinates = points.stream()
                .map(point -> String.format(Locale.ROOT, "%s %s", point.lng(), point.lat()))
                .reduce((left, right) -> left + ", " + right)
                .orElseThrow(() -> new IllegalArgumentException("route must contain at least 2 points"));

        return "LINESTRING(" + coordinates + ")";
    }

    private PublicHelpRequestResponse toPublicResponse(HelpRequest request) {
        return new PublicHelpRequestResponse(
                request.getId(),
                request.getTitle(),
                request.getCategory(),
                request.getPriority(),
                request.getStatus(),
                locationObfuscationService.approximate(request.getLocation()),
                locationObfuscationService.maskedArea(request.getLocation()),
                request.getCreatedAt()
        );
    }

    private void validateRouteRequest(RouteSearchRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("request body is required");
        }
        if (request.points() == null) {
            throw new IllegalArgumentException("points are required");
        }
        if (request.points().size() < MIN_ROUTE_POINTS) {
            throw new IllegalArgumentException("route must contain at least 2 points");
        }
        if (request.points().size() > MAX_ROUTE_POINTS) {
            throw new IllegalArgumentException("route cannot contain more than 100 points");
        }
        if (request.bufferMeters() < MIN_ROUTE_BUFFER_METERS || request.bufferMeters() > MAX_ROUTE_BUFFER_METERS) {
            throw new IllegalArgumentException("bufferMeters must be between 50 and 2000");
        }

        request.points().forEach(point -> {
            if (point == null) {
                throw new IllegalArgumentException("route points cannot be null");
            }
            validateCoordinates(point.lat(), point.lng());
        });
    }

    private void validateCoordinates(double lat, double lng) {
        if (lat < -90 || lat > 90) {
            throw new IllegalArgumentException("lat must be between -90 and 90");
        }
        if (lng < -180 || lng > 180) {
            throw new IllegalArgumentException("lng must be between -180 and 180");
        }
    }
}
