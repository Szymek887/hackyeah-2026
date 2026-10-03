package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.ClassificationInput;
import com.telecrazy.hackyeah2026backend.ai.ClassificationSource;
import com.telecrazy.hackyeah2026backend.ai.RequestClassification;
import com.telecrazy.hackyeah2026backend.ai.RequestClassificationService;
import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.api.CreateHelpRequestRequest;
import com.telecrazy.hackyeah2026backend.api.FullHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView;
import com.telecrazy.hackyeah2026backend.api.PublicHelpRequestDetailsResponse;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class HelpRequestDetailsServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    private final HelpRequestRepository repository = mock(HelpRequestRepository.class);
    private final RequestClassificationService classifier = mock(RequestClassificationService.class);
    private final HelpRequestDetailsService service = new HelpRequestDetailsService(
            repository,
            classifier,
            new HelpRequestViewMapper(new LocationObfuscationService())
    );

    private final AppUser anna = user(1L, UserRole.REQUESTER, true);
    private final AppUser marek = user(2L, UserRole.REQUESTER, false);
    private final AppUser kuba = user(4L, UserRole.VOLUNTEER, false);

    @BeforeEach
    void saveReturnsEntityWithId() {
        given(repository.save(any(HelpRequest.class))).willAnswer(invocation -> {
            HelpRequest saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });
    }

    @Test
    void createStoresClassificationAndReturnsFullDetails() {
        givenClassification(HelpCategory.MEDICINE, 2, Set.of());

        FullHelpRequestResponse response = service.create(body(), marek);

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.category()).isEqualTo(HelpCategory.MEDICINE);
        assertThat(response.priority()).isEqualTo(2);
        assertThat(response.aiPriority()).isEqualTo(2);
        assertThat(response.tags()).containsExactly("leki");
        assertThat(response.classificationSource()).isEqualTo(ClassificationSource.LLM);
        assertThat(response.status()).isEqualTo(HelpRequestStatus.OPEN);
        assertThat(response.location().coordinates()).containsExactly(19.9449, 50.0647);
        assertThat(response.street()).isEqualTo("Długa");
        assertThat(response.apartmentNumber()).isNull();
        assertThat(response.requester().id()).isEqualTo(2L);
        assertThat(response.volunteer()).isNull();

        ArgumentCaptor<ClassificationInput> input = ArgumentCaptor.forClass(ClassificationInput.class);
        verify(classifier).classify(input.capture());
        assertThat(input.getValue().title()).isEqualTo("Potrzebuję leków");
    }

    @Test
    void createBumpsPriorityForRequesterWithSpecialNeeds() {
        givenClassification(HelpCategory.GROCERIES, 3, Set.of());

        FullHelpRequestResponse response = service.create(body(), anna);

        assertThat(response.aiPriority()).isEqualTo(3);
        assertThat(response.priority()).isEqualTo(2);
    }

    @Test
    void createPutsSuspectedScamUnderReview() {
        givenClassification(HelpCategory.GROCERIES, 3, Set.of(RiskFlag.SCAM_SUSPECTED));

        FullHelpRequestResponse response = service.create(body(), marek);

        assertThat(response.status()).isEqualTo(HelpRequestStatus.UNDER_REVIEW);
        assertThat(response.riskFlags()).containsExactly(RiskFlag.SCAM_SUSPECTED);
    }

    @Test
    void createKeepsMedicalEmergencyOpenAndFlagged() {
        givenClassification(HelpCategory.MEDICINE, 1, Set.of(RiskFlag.MEDICAL_EMERGENCY));

        FullHelpRequestResponse response = service.create(body(), marek);

        assertThat(response.status()).isEqualTo(HelpRequestStatus.OPEN);
        assertThat(response.priority()).isEqualTo(1);
        assertThat(response.riskFlags()).containsExactly(RiskFlag.MEDICAL_EMERGENCY);
    }

    @Test
    void cityAdminCannotCreateRequests() {
        assertThatThrownBy(() -> service.create(body(), user(5L, UserRole.CITY_ADMIN, false)))
                .isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(classifier, repository);
    }

    @Test
    void requesterGetsFullDetails() {
        given(repository.findById(10L)).willReturn(Optional.of(storedRequest(HelpRequestStatus.OPEN, Set.of())));

        HelpRequestView view = service.getDetails(10L, marek);

        assertThat(view).isInstanceOf(FullHelpRequestResponse.class);
        assertThat(view.visibility()).isEqualTo(HelpRequestView.Visibility.FULL);
    }

    @Test
    void otherUserGetsMaskedPublicDetails() {
        given(repository.findById(10L)).willReturn(Optional.of(storedRequest(HelpRequestStatus.OPEN, Set.of())));

        HelpRequestView view = service.getDetails(10L, kuba);

        assertThat(view).isInstanceOf(PublicHelpRequestDetailsResponse.class);
        PublicHelpRequestDetailsResponse publicView = (PublicHelpRequestDetailsResponse) view;
        assertThat(publicView.description()).isEqualTo("Skończyły mi się leki na serce.");
        assertThat(publicView.approximateLocation().coordinates()).doesNotContain(19.9449, 50.0647);
    }

    @Test
    void publicDetailsHideTitleAndDescriptionWithPersonalData() {
        given(repository.findById(10L))
                .willReturn(Optional.of(storedRequest(HelpRequestStatus.OPEN, Set.of(RiskFlag.PERSONAL_DATA))));

        PublicHelpRequestDetailsResponse view = (PublicHelpRequestDetailsResponse) service.getDetails(10L, kuba);

        assertThat(view.title()).isEqualTo("Prośba o pomoc z lekami");
        assertThat(view.description()).isNull();
        assertThat(service.getDetails(10L, marek))
                .isInstanceOfSatisfying(FullHelpRequestResponse.class,
                        full -> assertThat(full.title()).isEqualTo("Potrzebuję leków"));
    }

    @Test
    void requestUnderReviewIsNotFoundForOthers() {
        given(repository.findById(10L))
                .willReturn(Optional.of(storedRequest(HelpRequestStatus.UNDER_REVIEW, Set.of(RiskFlag.SCAM_SUSPECTED))));

        assertThatThrownBy(() -> service.getDetails(10L, kuba)).isInstanceOf(NotFoundException.class);
        assertThat(service.getDetails(10L, marek).visibility()).isEqualTo(HelpRequestView.Visibility.FULL);
    }

    @Test
    void missingRequestIsNotFound() {
        given(repository.findById(404L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDetails(404L, marek))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Help request 404 not found");
    }

    private void givenClassification(HelpCategory category, int priority, Set<RiskFlag> riskFlags) {
        given(classifier.classify(any())).willReturn(new RequestClassification(
                category, priority, List.of("leki"), riskFlags, ClassificationSource.LLM
        ));
    }

    private HelpRequest storedRequest(HelpRequestStatus status, Set<RiskFlag> riskFlags) {
        HelpRequest request = new HelpRequest(
                marek,
                "Potrzebuję leków",
                "Skończyły mi się leki na serce.",
                HelpCategory.MEDICINE,
                1,
                GEOMETRY_FACTORY.createPoint(new Coordinate(19.9449, 50.0647)),
                "Długa",
                "12",
                "5"
        );
        request.setId(10L);
        request.setStatus(status);
        request.setRiskFlags(Set.copyOf(riskFlags));
        return request;
    }

    private static CreateHelpRequestRequest body() {
        return new CreateHelpRequestRequest(
                "Potrzebuję leków",
                "Skończyły mi się leki na serce.",
                50.0647,
                19.9449,
                "Długa",
                "12",
                "  "
        );
    }

    private static AppUser user(long id, UserRole role, boolean specialNeeds) {
        AppUser user = new AppUser("User " + id, role, true, specialNeeds, 50);
        user.setId(id);
        return user;
    }
}
