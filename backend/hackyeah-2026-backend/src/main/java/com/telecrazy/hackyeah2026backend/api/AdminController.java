package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.auth.CurrentUser;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.service.ModerationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * City admin only (403 for other roles): review of requests the AI held back as suspected scams.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ModerationService moderationService;

    public AdminController(ModerationService moderationService) {
        this.moderationService = moderationService;
    }

    /** {@code UNDER_REVIEW} requests, oldest first. */
    @GetMapping("/review-queue")
    public List<ModerationItem> reviewQueue(@CurrentUser AppUser user) {
        return moderationService.reviewQueue(user);
    }

    /** {@code UNDER_REVIEW -> OPEN}. 409 when the request is not waiting for review. */
    @PostMapping("/help-requests/{id}/approve")
    public ModerationItem approve(@PathVariable long id, @CurrentUser AppUser user) {
        return moderationService.approve(id, user);
    }

    /** {@code UNDER_REVIEW -> CANCELLED}. 409 when the request is not waiting for review. */
    @PostMapping("/help-requests/{id}/dismiss")
    public ModerationItem dismiss(@PathVariable long id, @CurrentUser AppUser user) {
        return moderationService.dismiss(id, user);
    }
}
