package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.ClassificationInput;
import com.telecrazy.hackyeah2026backend.ai.MedicineRedaction;
import com.telecrazy.hackyeah2026backend.ai.RequestClassification;
import com.telecrazy.hackyeah2026backend.ai.RequestClassificationService;
import com.telecrazy.hackyeah2026backend.api.CreateHelpRequestRequest;
import com.telecrazy.hackyeah2026backend.api.FullHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView;
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

/**
 * Creating help requests and reading their details with role- and status-dependent visibility.
 */
@Service
public class HelpRequestDetailsService {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    private final HelpRequestRepository helpRequestRepository;
    private final RequestClassificationService classificationService;
    private final HelpRequestViewMapper viewMapper;

    public HelpRequestDetailsService(
            HelpRequestRepository helpRequestRepository,
            RequestClassificationService classificationService,
            HelpRequestViewMapper viewMapper
    ) {
        this.helpRequestRepository = helpRequestRepository;
        this.classificationService = classificationService;
        this.viewMapper = viewMapper;
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

        // Medicine names and usage must not be stored: the requester gives the details in person.
        boolean redact = MedicineRedaction.applies(classification.category());
        HelpRequest request = new HelpRequest(
                requester,
                redact ? MedicineRedaction.TITLE : body.title().trim(),
                redact ? MedicineRedaction.DESCRIPTION : body.description().trim(),
                classification.category(),
                // Only consented special needs count (contract §3.6) – also for rows from before consent records.
                PriorityPolicy.finalPriority(classification.priority(), requester.sharesSpecialNeeds()),
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

        return viewMapper.toFullResponse(helpRequestRepository.save(request), requester);
    }

    @Transactional(readOnly = true)
    public HelpRequestView getDetails(long id, AppUser user) {
        HelpRequest request = helpRequestRepository.findById(id)
                .filter(found -> HelpRequestVisibilityPolicy.canSee(found, user))
                .orElseThrow(() -> new NotFoundException("Help request " + id + " not found"));

        return viewMapper.toView(request, user);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
