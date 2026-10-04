package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.ai.RiskFlag;
import com.telecrazy.hackyeah2026backend.api.ModerationItem;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ConflictException;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class ModerationServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);
    private static final Instant NOW = Instant.parse("2026-10-04T12:00:00Z");

    private final HelpRequestRepository helpRequestRepository = mock(HelpRequestRepository.class);
    private final ModerationService service = new ModerationService(
            helpRequestRepository,
            new LocationObfuscationService(),
            Clock.fixed(NOW, ZoneOffset.UTC)
    );

    private final AppUser admin = user(99L, UserRole.CITY_ADMIN);
    private final AppUser requester = user(1L, UserRole.REQUESTER);

    private HelpRequest request;

    @BeforeEach
    void setUp() {
        request = request(HelpRequestStatus.UNDER_REVIEW);
        given(helpRequestRepository.findByIdForUpdate(10L)).willAnswer(invocation -> Optional.of(request));
        given(helpRequestRepository.saveAndFlush(any(HelpRequest.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void queueShowsOriginalTextAndMaskedLocationOnly() {
        given(helpRequestRepository.findByStatusOrderByCreatedAtAsc(HelpRequestStatus.UNDER_REVIEW))
                .willReturn(List.of(request));

        List<ModerationItem> queue = service.reviewQueue(admin);

        assertThat(queue).hasSize(1);
        ModerationItem item = queue.getFirst();
        assertThat(item.description()).isEqualTo("Prosze o kod BLIK na 200 zl.");
        assertThat(item.riskFlags()).containsExactly(RiskFlag.SCAM_SUSPECTED);
        assertThat(item.requester().displayName()).isEqualTo("User 1");
        assertThat(item.maskedArea().type()).isEqualTo("Polygon");
        assertThat(item.reviewedAt()).isNull();
        // The approximate point is the masked cell centre, never the exact location.
        assertThat(item.approximateLocation().coordinates()).isNotEqualTo(new double[]{19.9301, 50.0738});
    }

    @Test
    void approvePublishesRequestAndRecordsDecision() {
        ModerationItem item = service.approve(10L, admin);

        assertThat(item.status()).isEqualTo(HelpRequestStatus.OPEN);
        assertThat(item.reviewedAt()).isEqualTo(NOW);
        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.OPEN);
        assertThat(request.getReviewedBy()).isSameAs(admin);
        // The AI's flag stays as a record of why the request was held back.
        assertThat(request.getRiskFlags()).contains(RiskFlag.SCAM_SUSPECTED);
    }

    @Test
    void dismissCancelsRequest() {
        ModerationItem item = service.dismiss(10L, admin);

        assertThat(item.status()).isEqualTo(HelpRequestStatus.CANCELLED);
        assertThat(request.getReviewedBy()).isSameAs(admin);
        assertThat(request.getReviewedAt()).isEqualTo(NOW);
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"REQUESTER", "VOLUNTEER"})
    void onlyCityAdminsCanReview(UserRole role) {
        AppUser user = user(5L, role);

        assertThatThrownBy(() -> service.reviewQueue(user)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.approve(10L, user)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.dismiss(10L, user)).isInstanceOf(ForbiddenException.class);
        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.UNDER_REVIEW);
        verify(helpRequestRepository, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @EnumSource(value = HelpRequestStatus.class, names = "UNDER_REVIEW", mode = EnumSource.Mode.EXCLUDE)
    void decisionNeedsRequestWaitingForReview(HelpRequestStatus status) {
        request.setStatus(status);

        assertThatThrownBy(() -> service.approve(10L, admin)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.dismiss(10L, admin)).isInstanceOf(ConflictException.class);
        assertThat(request.getStatus()).isEqualTo(status);
    }

    @Test
    void unknownRequestIsNotFound() {
        assertThatThrownBy(() -> service.approve(404L, admin)).isInstanceOf(NotFoundException.class);
    }

    private HelpRequest request(HelpRequestStatus status) {
        HelpRequest created = new HelpRequest(
                requester,
                "Pomoc z rachunkiem",
                "Prosze o kod BLIK na 200 zl.",
                HelpCategory.HOME_SUPPORT,
                2,
                GEOMETRY_FACTORY.createPoint(new Coordinate(19.9301, 50.0738)),
                "Krolewska",
                "41",
                null
        );
        created.setId(10L);
        created.setStatus(status);
        created.setRiskFlags(new HashSet<>(Set.of(RiskFlag.SCAM_SUSPECTED)));
        return created;
    }

    private static AppUser user(long id, UserRole role) {
        AppUser user = new AppUser("User " + id, role, true, 70);
        user.setId(id);
        return user;
    }
}
