package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.PublicHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HelpRequestService {

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

    private PublicHelpRequestResponse toPublicResponse(HelpRequest request) {
        return new PublicHelpRequestResponse(
                request.getId(),
                request.getTitle(),
                request.getCategory(),
                request.getPriority(),
                request.getStatus(),
                locationObfuscationService.approximate(request.getLocation()),
                request.getCreatedAt()
        );
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
