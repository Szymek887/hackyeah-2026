package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.ClassificationInput;
import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.MedicineRedaction;
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
import com.telecrazy.hackyeah2026backend.exception.FieldValidationException;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
        // Medicine names and usage must not be stored: the requester gives the details in person.
        // Preset requests get the safe pharmacy text; free text about medicine (typed or dictated)
        // is redacted instead of rejected, so the general form and voice requests keep working.
        boolean redact = !medicinePreset
                && (MedicineRedaction.applies(classification.category()) || MedicineRedaction.applies(category));
        String title = medicinePreset
                ? MedicineRequestPolicy.SAFE_TITLE
                : redact ? MedicineRedaction.TITLE : body.title().trim();
        String description = medicinePreset
                ? MedicineRequestPolicy.SAFE_DESCRIPTION
                : redact ? MedicineRedaction.DESCRIPTION : body.description().trim();
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

    /** Preset medicine request: same special priority as redacted medicine requests. */
    private static RequestClassification medicineClassification() {
        return new RequestClassification(
                HelpCategory.MEDICINE,
                RequestClassification.SPECIAL,
                MedicineRequestPolicy.TAGS,
                Set.of(),
                ClassificationSource.PRESET
        );
    }

    private static void validateMedicinePreset(CreateHelpRequestRequest body) {
        if (hasText(body.title()) || hasText(body.description())) {
            Map<String, String> errors = new LinkedHashMap<>();
            if (hasText(body.title())) {
                errors.put("title", "must be empty for medicine requests");
            }
            if (hasText(body.description())) {
                errors.put("description", "must be empty for medicine requests");
            }
            throw new FieldValidationException("Request validation failed", errors);
        }
    }

    private static void validateGeneralText(CreateHelpRequestRequest body) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (!hasText(body.title())) {
            errors.put("title", "must not be blank");
        }
        if (!hasText(body.description())) {
            errors.put("description", "must not be blank");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException("Request validation failed", errors);
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
