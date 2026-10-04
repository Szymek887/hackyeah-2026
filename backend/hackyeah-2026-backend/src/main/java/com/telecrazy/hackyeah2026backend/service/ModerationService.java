package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.ModerationItem;
import com.telecrazy.hackyeah2026backend.api.UserSummary;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.exception.ConflictException;
import com.telecrazy.hackyeah2026backend.exception.ForbiddenException;
import com.telecrazy.hackyeah2026backend.exception.NotFoundException;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Set;

/**
 * City admin decisions on requests the AI held back as suspected scams:
 * <pre>
 * UNDER_REVIEW --approve--> OPEN        (published to volunteers)
 * UNDER_REVIEW --dismiss--> CANCELLED   (never published)
 * </pre>
 * The decision and the admin who made it are stored on the request.
 */
@Service
public class ModerationService {

    private final HelpRequestRepository helpRequestRepository;
    private final LocationObfuscationService locationObfuscationService;
    private final Clock clock;

    public ModerationService(
            HelpRequestRepository helpRequestRepository,
            LocationObfuscationService locationObfuscationService,
            Clock clock
    ) {
        this.helpRequestRepository = helpRequestRepository;
        this.locationObfuscationService = locationObfuscationService;
        this.clock = clock;
    }

    /** Requests waiting for a decision, oldest first. */
    @Transactional(readOnly = true)
    public List<ModerationItem> reviewQueue(AppUser admin) {
        requireAdmin(admin);
        return helpRequestRepository.findByStatusOrderByCreatedAtAsc(HelpRequestStatus.UNDER_REVIEW)
                .stream()
                .map(this::toItem)
                .toList();
    }

    /** The AI was wrong: {@code UNDER_REVIEW -> OPEN}, volunteers can now see and offer help. */
    @Transactional
    public ModerationItem approve(long id, AppUser admin) {
        return decide(id, admin, HelpRequestStatus.OPEN);
    }

    /** The request is a scam or otherwise not acceptable: {@code UNDER_REVIEW -> CANCELLED}. */
    @Transactional
    public ModerationItem dismiss(long id, AppUser admin) {
        return decide(id, admin, HelpRequestStatus.CANCELLED);
    }

    private ModerationItem decide(long id, AppUser admin, HelpRequestStatus decision) {
        requireAdmin(admin);
        HelpRequest request = helpRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("Help request " + id + " not found"));
        if (request.getStatus() != HelpRequestStatus.UNDER_REVIEW) {
            throw new ConflictException("Help request is not waiting for review");
        }

        request.setStatus(decision);
        request.setReviewedBy(admin);
        request.setReviewedAt(clock.instant());
        return toItem(helpRequestRepository.saveAndFlush(request));
    }

    private static void requireAdmin(AppUser user) {
        if (user.getRole() != UserRole.CITY_ADMIN) {
            throw new ForbiddenException("Only city administrators can review help requests");
        }
    }

    private ModerationItem toItem(HelpRequest request) {
        return new ModerationItem(
                request.getId(),
                request.getTitle(),
                request.getDescription(),
                request.getCategory(),
                request.getPriority(),
                request.getStatus(),
                Set.copyOf(request.getRiskFlags()),
                List.copyOf(request.getTags()),
                request.getClassificationSource(),
                UserSummary.from(request.getRequester()),
                locationObfuscationService.approximate(request.getLocation()),
                locationObfuscationService.maskedArea(request.getLocation()),
                request.getCreatedAt(),
                request.getReviewedAt()
        );
    }
}
