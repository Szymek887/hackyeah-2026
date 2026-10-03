package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.CreateRatingRequest;
import com.telecrazy.hackyeah2026backend.api.HandoffTokenResponse;
import com.telecrazy.hackyeah2026backend.api.HelpRequestView;
import com.telecrazy.hackyeah2026backend.api.RatingResponse;
import com.telecrazy.hackyeah2026backend.api.UserSummary;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Help request state machine and the actions around it:
 * <pre>
 * OPEN --offer--> OFFERED --accept--> ACCEPTED --complete (QR)--> COMPLETED --both rated--> RATED
 *   ^               |
 *   +----reject-----+          cancel: OPEN / OFFERED / ACCEPTED / UNDER_REVIEW --> CANCELLED
 * </pre>
 * Every action loads the request with a row lock, then checks: visible to the caller (else 404),
 * caller allowed to act (else 403), status allows the transition (else 409).
 */
@Service
public class HelpRequestWorkflowService {

    static final Duration HANDOFF_TOKEN_TTL = Duration.ofHours(24);

    private static final int HANDOFF_TOKEN_BYTES = 32;
    private static final Set<HelpRequestStatus> CANCELLABLE_STATUSES = EnumSet.of(
            HelpRequestStatus.OPEN,
            HelpRequestStatus.OFFERED,
            HelpRequestStatus.ACCEPTED,
            HelpRequestStatus.UNDER_REVIEW
    );

    private final HelpRequestRepository helpRequestRepository;
    private final AppUserRepository userRepository;
    private final RatingRepository ratingRepository;
    private final HelpRequestViewMapper viewMapper;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public HelpRequestWorkflowService(
            HelpRequestRepository helpRequestRepository,
            AppUserRepository userRepository,
            RatingRepository ratingRepository,
            HelpRequestViewMapper viewMapper,
            Clock clock
    ) {
        this.helpRequestRepository = helpRequestRepository;
        this.userRepository = userRepository;
        this.ratingRepository = ratingRepository;
        this.viewMapper = viewMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<HelpRequestView> findMine(AppUser user) {
        return helpRequestRepository.findInvolving(user)
                .stream()
                .map(request -> viewMapper.toView(request, user))
                .toList();
    }

    /** Volunteer offers help: {@code OPEN -> OFFERED}. */
    @Transactional
    public HelpRequestView offer(long id, AppUser user) {
        HelpRequest request = loadForUpdate(id, user);
        if (user.getRole() != UserRole.VOLUNTEER || HelpRequestVisibilityPolicy.isRequester(request, user)) {
            throw new ForbiddenException("Only volunteers can offer help");
        }
        requireStatus(request, HelpRequestStatus.OPEN, "Help request is no longer open");

        request.setVolunteer(user);
        request.setStatus(HelpRequestStatus.OFFERED);
        return save(request, user);
    }

    /** Requester accepts the offer: {@code OFFERED -> ACCEPTED}. The volunteer now sees the address. */
    @Transactional
    public HelpRequestView accept(long id, AppUser user) {
        HelpRequest request = loadForUpdate(id, user);
        requireRequester(request, user, "Only the requester can accept an offer");
        requireStatus(request, HelpRequestStatus.OFFERED, "Help request has no pending offer");

        request.setStatus(HelpRequestStatus.ACCEPTED);
        issueHandoffToken(request);
        return save(request, user);
    }

    /** Requester rejects the offer: {@code OFFERED -> OPEN}, the request is available to others again. */
    @Transactional
    public HelpRequestView reject(long id, AppUser user) {
        HelpRequest request = loadForUpdate(id, user);
        requireRequester(request, user, "Only the requester can reject an offer");
        requireStatus(request, HelpRequestStatus.OFFERED, "Help request has no pending offer");

        request.setVolunteer(null);
        request.setStatus(HelpRequestStatus.OPEN);
        return save(request, user);
    }

    /** Requester cancels the request before it is completed. The QR token stops working. */
    @Transactional
    public HelpRequestView cancel(long id, AppUser user) {
        HelpRequest request = loadForUpdate(id, user);
        requireRequester(request, user, "Only the requester can cancel a help request");
        if (!CANCELLABLE_STATUSES.contains(request.getStatus())) {
            throw new ConflictException("Help request in status " + request.getStatus() + " cannot be cancelled");
        }

        request.setStatus(HelpRequestStatus.CANCELLED);
        clearHandoffToken(request);
        return save(request, user);
    }

    /**
     * QR token for the requester of an accepted request. Returns the current token; issues a new one
     * when there is none (e.g. seeded data) or it expired.
     */
    @Transactional
    public HandoffTokenResponse handoffToken(long id, AppUser user) {
        HelpRequest request = loadForUpdate(id, user);
        requireRequester(request, user, "Only the requester can show the QR code");
        requireStatus(request, HelpRequestStatus.ACCEPTED, "QR code is available only for accepted requests");

        if (request.getHandoffToken() == null || isExpired(request)) {
            issueHandoffToken(request);
            helpRequestRepository.saveAndFlush(request);
        }
        return new HandoffTokenResponse(request.getId(), request.getHandoffToken(), request.getHandoffTokenExpiresAt());
    }

    /** Assigned volunteer scanned the requester's QR code: {@code ACCEPTED -> COMPLETED}. */
    @Transactional
    public HelpRequestView complete(long id, String token, AppUser user) {
        HelpRequest request = loadForUpdate(id, user);
        if (!HelpRequestVisibilityPolicy.isVolunteer(request, user)) {
            throw new ForbiddenException("Only the assigned volunteer can complete a help request");
        }
        requireStatus(request, HelpRequestStatus.ACCEPTED, "Help request is not in progress");
        if (request.getHandoffTokenUsedAt() != null) {
            throw new ConflictException("QR code was already used");
        }
        if (!tokenMatches(request.getHandoffToken(), token)) {
            throw new IllegalArgumentException("Invalid QR code");
        }
        if (isExpired(request)) {
            throw new IllegalArgumentException("QR code expired, ask the requester to show it again");
        }

        request.setHandoffTokenUsedAt(clock.instant());
        request.setStatus(HelpRequestStatus.COMPLETED);
        return save(request, user);
    }

    /**
     * Requester or volunteer rates the other side of a completed request, once per side.
     * Once both sides rated, the request becomes {@code RATED}.
     */
    @Transactional
    public RatingResponse rate(long id, CreateRatingRequest body, AppUser user) {
        HelpRequest request = loadForUpdate(id, user);
        boolean ratedByRequester = HelpRequestVisibilityPolicy.isRequester(request, user);
        if (!ratedByRequester && !HelpRequestVisibilityPolicy.isVolunteer(request, user)) {
            throw new ForbiddenException("Only the requester and the volunteer can rate each other");
        }
        requireStatus(request, HelpRequestStatus.COMPLETED, "Only completed help requests can be rated");
        if (ratingRepository.existsByHelpRequestIdAndFromUserId(request.getId(), user.getId())) {
            throw new ConflictException("You have already rated this help request");
        }

        AppUser ratedUser = ratedByRequester ? request.getVolunteer() : request.getRequester();
        ratedUser = userRepository.findByIdForUpdate(ratedUser.getId())
                .orElseThrow(() -> new NotFoundException("Rated user not found"));

        int stars = body.stars();
        ratingRepository.save(new Rating(request, user, ratedUser, stars, blankToNull(body.comment())));
        ratedUser.addRating(stars);
        ratedUser.setTrustScore(ReputationPolicy.updatedTrustScore(ratedUser.getTrustScore(), stars));
        int cityPoints = ratedByRequester ? ReputationPolicy.volunteerCityPoints(stars) : 0;
        ratedUser.setCityPoints(ratedUser.getCityPoints() + cityPoints);

        if (ratingRepository.existsByHelpRequestIdAndFromUserId(request.getId(), ratedUser.getId())) {
            request.setStatus(HelpRequestStatus.RATED);
        }
        helpRequestRepository.saveAndFlush(request);
        return new RatingResponse(request.getStatus(), UserSummary.from(ratedUser), cityPoints);
    }

    private HelpRequest loadForUpdate(long id, AppUser user) {
        return helpRequestRepository.findByIdForUpdate(id)
                .filter(found -> HelpRequestVisibilityPolicy.canSee(found, user))
                .orElseThrow(() -> new NotFoundException("Help request " + id + " not found"));
    }

    /** Flushes, so version conflicts surface here as 409 and the view has the new {@code updatedAt}. */
    private HelpRequestView save(HelpRequest request, AppUser user) {
        return viewMapper.toView(helpRequestRepository.saveAndFlush(request), user);
    }

    private static void requireRequester(HelpRequest request, AppUser user, String message) {
        if (!HelpRequestVisibilityPolicy.isRequester(request, user)) {
            throw new ForbiddenException(message);
        }
    }

    private static void requireStatus(HelpRequest request, HelpRequestStatus expected, String message) {
        if (request.getStatus() != expected) {
            throw new ConflictException(message);
        }
    }

    private void issueHandoffToken(HelpRequest request) {
        byte[] bytes = new byte[HANDOFF_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        request.setHandoffToken(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
        request.setHandoffTokenExpiresAt(clock.instant().plus(HANDOFF_TOKEN_TTL));
        request.setHandoffTokenUsedAt(null);
    }

    private static void clearHandoffToken(HelpRequest request) {
        request.setHandoffToken(null);
        request.setHandoffTokenExpiresAt(null);
    }

    private boolean isExpired(HelpRequest request) {
        Instant expiresAt = request.getHandoffTokenExpiresAt();
        return expiresAt == null || !clock.instant().isBefore(expiresAt);
    }

    /** Constant-time comparison, so the token cannot be guessed from response times. */
    private static boolean tokenMatches(String expected, String provided) {
        if (expected == null || provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.trim().getBytes(StandardCharsets.UTF_8)
        );
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
