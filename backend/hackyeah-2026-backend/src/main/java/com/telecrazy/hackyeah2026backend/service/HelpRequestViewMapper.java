package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.FullHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.api.GeoJsonPoint;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView;
import com.telecrazy.hackyeah2026backend.api.PublicHelpRequestDetailsResponse;
import com.telecrazy.hackyeah2026backend.api.UserSummary;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * Builds the view of a single help request for a given user: {@code FULL} or masked {@code PUBLIC},
 * as decided by {@link HelpRequestVisibilityPolicy}. Must be called inside a transaction (lazy users).
 */
@Component
public class HelpRequestViewMapper {

    private final LocationObfuscationService locationObfuscationService;

    public HelpRequestViewMapper(LocationObfuscationService locationObfuscationService) {
        this.locationObfuscationService = locationObfuscationService;
    }

    public HelpRequestView toView(HelpRequest request, AppUser user) {
        if (HelpRequestVisibilityPolicy.canSeeFullDetails(request, user)) {
            return toFullResponse(request, user);
        }
        return toPublicResponse(request, user);
    }

    public FullHelpRequestResponse toFullResponse(HelpRequest request, AppUser user) {
        return new FullHelpRequestResponse(
                request.getId(),
                request.getTitle(),
                request.getDescription(),
                request.getCategory(),
                request.getPriority(),
                request.getAiPriority(),
                request.getStatus(),
                List.copyOf(request.getTags()),
                Set.copyOf(request.getRiskFlags()),
                request.getClassificationSource(),
                GeoJsonPoint.of(request.getLocation().getX(), request.getLocation().getY()),
                request.getStreet(),
                request.getBuildingNumber(),
                request.getApartmentNumber(),
                UserSummary.from(request.getRequester()),
                // FULL is shown only to the requester and to the volunteer from ACCEPTED on, see the policy
                request.getRequester().sharesSpecialNeeds(),
                request.getRequester().sharedDisabilities(),
                request.getRequester().sharedSpecialNeedNotes(),
                UserSummary.from(request.getVolunteer()),
                MedicineRequestPolicy.requesterInstructions(request),
                MedicineRequestPolicy.volunteerInstructions(request),
                request.getCreatedAt(),
                request.getUpdatedAt(),
                HelpRequestVisibilityPolicy.viewerRole(request, user)
        );
    }

    private PublicHelpRequestDetailsResponse toPublicResponse(HelpRequest request, AppUser user) {
        return new PublicHelpRequestDetailsResponse(
                request.getId(),
                PublicTextPolicy.publicTitle(request),
                PublicTextPolicy.publicDescription(request),
                request.getCategory(),
                request.getPriority(),
                request.getStatus(),
                List.copyOf(request.getTags()),
                MedicineRequestPolicy.requesterInstructions(request),
                MedicineRequestPolicy.volunteerInstructions(request),
                locationObfuscationService.approximate(request.getLocation()),
                locationObfuscationService.maskedArea(request.getLocation()),
                request.getCreatedAt(),
                HelpRequestVisibilityPolicy.viewerRole(request, user)
        );
    }
}
