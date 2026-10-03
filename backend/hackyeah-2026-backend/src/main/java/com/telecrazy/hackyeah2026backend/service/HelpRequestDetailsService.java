package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.ClassificationInput;
import com.telecrazy.hackyeah2026backend.ai.RequestClassification;
import com.telecrazy.hackyeah2026backend.ai.RequestClassificationService;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.api.CreateHelpRequestRequest;
import com.telecrazy.hackyeah2026backend.api.FullHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.api.GeoJsonPoint;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView;
import com.telecrazy.hackyeah2026backend.api.PublicHelpRequestDetailsResponse;
import com.telecrazy.hackyeah2026backend.api.UserSummary;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Creating help requests and reading their details with role- and status-dependent visibility.
 */
@Service
public class HelpRequestDetailsService {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    private final HelpRequestRepository helpRequestRepository;
    private final RequestClassificationService classificationService;
    private final LocationObfuscationService locationObfuscationService;

    public HelpRequestDetailsService(
            HelpRequestRepository helpRequestRepository,
            RequestClassificationService classificationService,
            LocationObfuscationService locationObfuscationService
    ) {
        this.helpRequestRepository = helpRequestRepository;
        this.classificationService = classificationService;
        this.locationObfuscationService = locationObfuscationService;
    }

    /**
     * Not transactional on purpose: the LLM call can take seconds and must not hold a DB connection.
     */
    public FullHelpRequestResponse create(CreateHelpRequestRequest body, AppUser requester) {
        if (requester.getRole() == UserRole.CITY_ADMIN) {
            throw new ForbiddenException("City administrators cannot create help requests");
        }

        RequestClassification classification = classificationService.classify(
                new ClassificationInput(body.title(), body.description())
        );

        HelpRequest request = new HelpRequest(
                requester,
                body.title().trim(),
                body.description().trim(),
                classification.category(),
                PriorityPolicy.finalPriority(classification.priority(), requester.isSpecialNeeds()),
                GEOMETRY_FACTORY.createPoint(new Coordinate(body.lng(), body.lat())),
                body.street().trim(),
                body.buildingNumber().trim(),
                blankToNull(body.apartmentNumber())
        );
        request.setAiPriority(classification.priority());
        request.setClassificationSource(classification.source());
        request.setTags(List.copyOf(classification.tags()));
        request.setRiskFlags(new HashSet<>(classification.riskFlags()));
        if (classification.scamSuspected()) {
            request.setStatus(HelpRequestStatus.UNDER_REVIEW);
        }

        return toFullResponse(helpRequestRepository.save(request));
    }

    @Transactional(readOnly = true)
    public HelpRequestView getDetails(long id, AppUser user) {
        HelpRequest request = helpRequestRepository.findById(id)
                .filter(found -> HelpRequestVisibilityPolicy.canSee(found, user))
                .orElseThrow(() -> new NotFoundException("Help request " + id + " not found"));

        if (HelpRequestVisibilityPolicy.canSeeFullDetails(request, user)) {
            return toFullResponse(request);
        }
        return toPublicResponse(request);
    }

    private FullHelpRequestResponse toFullResponse(HelpRequest request) {
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
                UserSummary.from(request.getVolunteer()),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }

    private PublicHelpRequestDetailsResponse toPublicResponse(HelpRequest request) {
        boolean descriptionHasPersonalData = request.getRiskFlags().contains(RiskFlag.PERSONAL_DATA);
        return new PublicHelpRequestDetailsResponse(
                request.getId(),
                request.getTitle(),
                descriptionHasPersonalData ? null : request.getDescription(),
                request.getCategory(),
                request.getPriority(),
                request.getStatus(),
                List.copyOf(request.getTags()),
                locationObfuscationService.approximate(request.getLocation()),
                locationObfuscationService.maskedArea(request.getLocation()),
                request.getCreatedAt()
        );
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
