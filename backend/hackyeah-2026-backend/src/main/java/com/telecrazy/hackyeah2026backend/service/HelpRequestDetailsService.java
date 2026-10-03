package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.ClassificationInput;
import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.RequestClassification;
import com.telecrazy.hackyeah2026backend.ai.RequestClassificationService;
import com.telecrazy.hackyeah2026backend.api.CreateHelpRequestRequest;
import com.telecrazy.hackyeah2026backend.api.FullHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
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
        if (body == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (requester.getRole() == UserRole.CITY_ADMIN) {
            throw new ForbiddenException("City administrators cannot create help requests");
        }

        validateAddress(body);

        boolean medicinePreset = MedicineRequestPolicy.isMedicine(body.category());
        if (medicinePreset) {
            validateMedicinePreset(body);
        } else {
            validateGeneralText(body);
        }

        RequestClassification classification = medicinePreset
                ? medicineClassification()
                : classify(body);

        HelpCategory category = body.category() != null ? body.category() : classification.category();
        String title = medicinePreset ? MedicineRequestPolicy.SAFE_TITLE : body.title().trim();
        String description = medicinePreset ? MedicineRequestPolicy.SAFE_DESCRIPTION : body.description().trim();
        List<String> tags = medicinePreset ? MedicineRequestPolicy.TAGS : List.copyOf(classification.tags());

        HelpRequest request = new HelpRequest(
                requester,
                title,
                description,
                category,
                PriorityPolicy.finalPriority(classification.priority(), requester.isSpecialNeeds()),
                GEOMETRY_FACTORY.createPoint(new Coordinate(body.lng(), body.lat())),
                body.street().trim(),
                body.buildingNumber().trim(),
                blankToNull(body.apartmentNumber())
        );
        request.setAiPriority(classification.priority());
        request.setClassificationSource(classification.source());
        request.setTags(tags);
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

    private RequestClassification classify(CreateHelpRequestRequest body) {
        return classificationService.classify(new ClassificationInput(body.title(), body.description()));
    }

    private static RequestClassification medicineClassification() {
        return new RequestClassification(
                HelpCategory.MEDICINE,
                2,
                MedicineRequestPolicy.TAGS,
                Set.of(),
                ClassificationSource.FALLBACK
        );
    }

    private static void validateMedicinePreset(CreateHelpRequestRequest body) {
        if (hasText(body.title()) || hasText(body.description())) {
            throw new IllegalArgumentException(
                    "Title and description are not accepted for medicine requests; choose the medicine category only"
            );
        }
    }

    private static void validateGeneralText(CreateHelpRequestRequest body) {
        if (!hasText(body.title())) {
            throw new IllegalArgumentException("title is required");
        }
        if (!hasText(body.description())) {
            throw new IllegalArgumentException("description is required");
        }
    }

    private static void validateAddress(CreateHelpRequestRequest body) {
        if (!hasText(body.street())) {
            throw new IllegalArgumentException("street is required");
        }
        if (!hasText(body.buildingNumber())) {
            throw new IllegalArgumentException("buildingNumber is required");
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
