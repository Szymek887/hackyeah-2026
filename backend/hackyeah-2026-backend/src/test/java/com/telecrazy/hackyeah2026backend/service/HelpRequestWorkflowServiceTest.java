package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.CreateRatingRequest;
import com.telecrazy.hackyeah2026backend.api.FullHelpRequestResponse;
import com.telecrazy.hackyeah2026backend.api.HandoffTokenResponse;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView.ViewerRole;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView.Visibility;
import com.telecrazy.hackyeah2026backend.api.RatingResponse;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.Rating;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ConflictException;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import com.telecrazy.hackyeah2026backend.repository.RatingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class HelpRequestWorkflowServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);
    private static final Instant NOW = Instant.parse("2026-10-03T12:00:00Z");

    private final HelpRequestRepository helpRequestRepository = mock(HelpRequestRepository.class);
    private final AppUserRepository userRepository = mock(AppUserRepository.class);
    private final RatingRepository ratingRepository = mock(RatingRepository.class);
    private final MutableClock clock = new MutableClock(NOW);
    private final HelpRequestWorkflowService service = new HelpRequestWorkflowService(
            helpRequestRepository,
            userRepository,
            ratingRepository,
            new HelpRequestViewMapper(new LocationObfuscationService()),
            clock
    );

    private final AppUser anna = user(1L, UserRole.REQUESTER, 72);
    private final AppUser kuba = user(9L, UserRole.VOLUNTEER, 90);
    private final AppUser ola = user(10L, UserRole.VOLUNTEER, 88);
    private final AppUser marek = user(2L, UserRole.REQUESTER, 66);

    private HelpRequest request;

    @BeforeEach
    void setUp() {
        request = request(HelpRequestStatus.OPEN);
        given(helpRequestRepository.findByIdForUpdate(10L)).willAnswer(invocation -> Optional.of(request));
        given(helpRequestRepository.saveAndFlush(any(HelpRequest.class))).willAnswer(invocation -> invocation.getArgument(0));
        for (AppUser user : List.of(anna, kuba)) {
            given(userRepository.findByIdForUpdate(user.getId())).willReturn(Optional.of(user));
        }
    }

    // ---------- offer ----------

    @Test
    void volunteerOffersHelpAndStillSeesOnlyPublicDetails() {
        HelpRequestView view = service.offer(10L, kuba);

        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.OFFERED);
        assertThat(request.getVolunteer()).isSameAs(kuba);
        assertThat(view.visibility()).isEqualTo(Visibility.PUBLIC);
        assertThat(view.viewerRole()).isEqualTo(ViewerRole.VOLUNTEER);
    }

    @Test
    void requesterCannotOfferHelp() {
        assertThatThrownBy(() -> service.offer(10L, marek)).isInstanceOf(ForbiddenException.class);
        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.OPEN);
    }

    @Test
    void secondOfferIsAConflict() {
        service.offer(10L, kuba);

        assertThatThrownBy(() -> service.offer(10L, ola)).isInstanceOf(ConflictException.class);
        assertThat(request.getVolunteer()).isSameAs(kuba);
    }

    @Test
    void requestUnderReviewIsNotFoundForVolunteers() {
        request.setStatus(HelpRequestStatus.UNDER_REVIEW);

        assertThatThrownBy(() -> service.offer(10L, kuba)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void missingRequestIsNotFound() {
        given(helpRequestRepository.findByIdForUpdate(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.offer(99L, kuba)).isInstanceOf(NotFoundException.class);
    }

    // ---------- accept / reject ----------

    @Test
    void requesterAcceptsOfferAndQrTokenIsIssued() {
        offered();

        HelpRequestView view = service.accept(10L, anna);

        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.ACCEPTED);
        assertThat(view.viewerRole()).isEqualTo(ViewerRole.REQUESTER);
        assertThat(request.getHandoffToken()).hasSize(43);
        assertThat(request.getHandoffTokenExpiresAt()).isEqualTo(NOW.plus(HelpRequestWorkflowService.HANDOFF_TOKEN_TTL));
    }

    @Test
    void volunteerSeesFullDetailsAfterAcceptance() {
        offered();
        service.accept(10L, anna);

        List<HelpRequestView> mine = withInvolving(kuba);

        assertThat(mine).singleElement().satisfies(view -> {
            assertThat(view.visibility()).isEqualTo(Visibility.FULL);
            assertThat(((FullHelpRequestResponse) view).street()).isEqualTo("Długa");
        });
    }

    @Test
    void onlyRequesterCanAccept() {
        offered();

        assertThatThrownBy(() -> service.accept(10L, kuba)).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void acceptWithoutOfferIsAConflict() {
        assertThatThrownBy(() -> service.accept(10L, anna)).isInstanceOf(ConflictException.class);
    }

    @Test
    void rejectReopensRequestForOthers() {
        offered();

        HelpRequestView view = service.reject(10L, anna);

        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.OPEN);
        assertThat(request.getVolunteer()).isNull();
        assertThat(((FullHelpRequestResponse) view).volunteer()).isNull();
    }

    // ---------- cancel ----------

    @ParameterizedTest
    @EnumSource(value = HelpRequestStatus.class, names = {"OPEN", "OFFERED", "ACCEPTED", "UNDER_REVIEW"})
    void requesterCanCancelBeforeCompletion(HelpRequestStatus status) {
        request.setStatus(status);
        request.setHandoffToken("token");

        service.cancel(10L, anna);

        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.CANCELLED);
        assertThat(request.getHandoffToken()).isNull();
    }

    @ParameterizedTest
    @EnumSource(value = HelpRequestStatus.class, names = {"COMPLETED", "RATED", "CANCELLED"})
    void finishedRequestCannotBeCancelled(HelpRequestStatus status) {
        request.setStatus(status);

        assertThatThrownBy(() -> service.cancel(10L, anna)).isInstanceOf(ConflictException.class);
    }

    @Test
    void volunteerCannotCancel() {
        offered();

        assertThatThrownBy(() -> service.cancel(10L, kuba)).isInstanceOf(ForbiddenException.class);
    }

    // ---------- QR ----------

    @Test
    void requesterGetsTheSameTokenUntilItExpires() {
        accepted();
        String issued = request.getHandoffToken();
        clearInvocations(helpRequestRepository);

        HandoffTokenResponse response = service.handoffToken(10L, anna);

        assertThat(response.token()).isEqualTo(issued);
        assertThat(response.requestId()).isEqualTo(10L);
        verify(helpRequestRepository, never()).saveAndFlush(any());
    }

    @Test
    void expiredOrMissingTokenIsReissued() {
        accepted();
        String issued = request.getHandoffToken();
        clock.advance(HelpRequestWorkflowService.HANDOFF_TOKEN_TTL);

        HandoffTokenResponse response = service.handoffToken(10L, anna);

        assertThat(response.token()).isNotEqualTo(issued);
        assertThat(response.expiresAt()).isAfter(clock.instant());

        request.setHandoffToken(null);
        assertThat(service.handoffToken(10L, anna).token()).isNotNull();
    }

    @Test
    void onlyRequesterOfAcceptedRequestGetsQr() {
        offered();
        assertThatThrownBy(() -> service.handoffToken(10L, anna)).isInstanceOf(ConflictException.class);

        accepted();
        assertThatThrownBy(() -> service.handoffToken(10L, kuba)).isInstanceOf(ForbiddenException.class);
    }

    // ---------- complete ----------

    @Test
    void volunteerCompletesWithScannedToken() {
        accepted();

        HelpRequestView view = service.complete(10L, " " + request.getHandoffToken() + "\n", kuba);

        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.COMPLETED);
        assertThat(request.getHandoffTokenUsedAt()).isEqualTo(NOW);
        assertThat(view.visibility()).isEqualTo(Visibility.FULL);
    }

    @Test
    void wrongTokenIsRejected() {
        accepted();

        assertThatThrownBy(() -> service.complete(10L, "not-the-token", kuba))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.ACCEPTED);
    }

    @Test
    void expiredTokenIsRejected() {
        accepted();
        clock.advance(HelpRequestWorkflowService.HANDOFF_TOKEN_TTL.plusSeconds(1));

        assertThatThrownBy(() -> service.complete(10L, request.getHandoffToken(), kuba))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void tokenCannotBeUsedTwice() {
        accepted();
        String token = request.getHandoffToken();
        service.complete(10L, token, kuba);

        assertThatThrownBy(() -> service.complete(10L, token, kuba)).isInstanceOf(ConflictException.class);
    }

    @Test
    void onlyAssignedVolunteerCompletes() {
        accepted();

        assertThatThrownBy(() -> service.complete(10L, request.getHandoffToken(), ola))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.complete(10L, request.getHandoffToken(), anna))
                .isInstanceOf(ForbiddenException.class);
    }

    // ---------- ratings ----------

    @Test
    void requesterRatesVolunteerWhoEarnsTrustAndPoints() {
        completed();

        RatingResponse response = service.rate(10L, new CreateRatingRequest(5, "  Dziękuję!  "), anna);

        ArgumentCaptor<Rating> saved = ArgumentCaptor.forClass(Rating.class);
        verify(ratingRepository).save(saved.capture());
        assertThat(saved.getValue().getFromUser()).isSameAs(anna);
        assertThat(saved.getValue().getToUser()).isSameAs(kuba);
        assertThat(saved.getValue().getComment()).isEqualTo("Dziękuję!");

        assertThat(response.requestStatus()).isEqualTo(HelpRequestStatus.COMPLETED);
        assertThat(response.cityPointsAwarded()).isEqualTo(25);
        assertThat(response.ratedUser().id()).isEqualTo(9L);
        assertThat(response.ratedUser().trustScore()).isEqualTo(92);
        assertThat(response.ratedUser().ratingAverage()).isEqualTo(5.0);
        assertThat(kuba.getCityPoints()).isEqualTo(25);
    }

    @Test
    void volunteerRatesRequesterWithoutPointsAndSecondRatingClosesRequest() {
        completed();
        given(ratingRepository.existsByHelpRequestIdAndFromUserId(10L, anna.getId())).willReturn(true);

        RatingResponse response = service.rate(10L, new CreateRatingRequest(4, null), kuba);

        assertThat(response.requestStatus()).isEqualTo(HelpRequestStatus.RATED);
        assertThat(request.getStatus()).isEqualTo(HelpRequestStatus.RATED);
        assertThat(response.cityPointsAwarded()).isZero();
        assertThat(anna.getRatingCount()).isEqualTo(1);
    }

    @Test
    void ratingTwiceIsAConflict() {
        completed();
        given(ratingRepository.existsByHelpRequestIdAndFromUserId(10L, anna.getId())).willReturn(true);

        assertThatThrownBy(() -> service.rate(10L, new CreateRatingRequest(5, null), anna))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void onlyCompletedRequestsCanBeRatedAndOnlyByParties() {
        accepted();
        assertThatThrownBy(() -> service.rate(10L, new CreateRatingRequest(5, null), anna))
                .isInstanceOf(ConflictException.class);

        request.setStatus(HelpRequestStatus.COMPLETED);
        assertThatThrownBy(() -> service.rate(10L, new CreateRatingRequest(5, null), ola))
                .isInstanceOf(ForbiddenException.class);
    }

    // ---------- mine ----------

    @Test
    void mineMarksTheCallersRole() {
        assertThat(withInvolving(anna)).singleElement()
                .satisfies(view -> assertThat(view.viewerRole()).isEqualTo(ViewerRole.REQUESTER));
    }

    // ---------- helpers ----------

    private List<HelpRequestView> withInvolving(AppUser user) {
        given(helpRequestRepository.findInvolving(user)).willReturn(List.of(request));
        return service.findMine(user);
    }

    private void offered() {
        request.setStatus(HelpRequestStatus.OFFERED);
        request.setVolunteer(kuba);
    }

    private void accepted() {
        offered();
        service.accept(10L, anna);
    }

    private void completed() {
        accepted();
        service.complete(10L, request.getHandoffToken(), kuba);
    }

    private HelpRequest request(HelpRequestStatus status) {
        HelpRequest created = new HelpRequest(
                anna,
                "Potrzebuję leków",
                "Skończyły mi się leki na serce.",
                HelpCategory.MEDICINE,
                1,
                GEOMETRY_FACTORY.createPoint(new Coordinate(19.9449, 50.0647)),
                "Długa",
                "1",
                null
        );
        created.setId(10L);
        created.setStatus(status);
        return created;
    }

    private static AppUser user(long id, UserRole role, int trustScore) {
        AppUser user = new AppUser("User " + id, role, true, false, trustScore);
        user.setId(id);
        return user;
    }

    private static final class MutableClock extends Clock {

        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }
}
