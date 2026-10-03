package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.auth.CurrentUser;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.service.HelpRequestWorkflowService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Help request lifecycle: offer / accept / reject / cancel, QR handoff, ratings and the caller's own requests.
 * State changes return the request as the caller sees it afterwards.
 */
@RestController
@RequestMapping("/api/help-requests")
public class HelpRequestWorkflowController {

    private final HelpRequestWorkflowService workflowService;

    public HelpRequestWorkflowController(HelpRequestWorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    /** Requests the caller created or volunteers on, newest first. */
    @GetMapping("/mine")
    public List<HelpRequestView> mine(@CurrentUser AppUser user) {
        return workflowService.findMine(user);
    }

    @PostMapping("/{id}/offer")
    public HelpRequestView offer(@PathVariable long id, @CurrentUser AppUser user) {
        return workflowService.offer(id, user);
    }

    @PostMapping("/{id}/accept")
    public HelpRequestView accept(@PathVariable long id, @CurrentUser AppUser user) {
        return workflowService.accept(id, user);
    }

    @PostMapping("/{id}/reject")
    public HelpRequestView reject(@PathVariable long id, @CurrentUser AppUser user) {
        return workflowService.reject(id, user);
    }

    @PostMapping("/{id}/cancel")
    public HelpRequestView cancel(@PathVariable long id, @CurrentUser AppUser user) {
        return workflowService.cancel(id, user);
    }

    @GetMapping("/{id}/qr")
    public HandoffTokenResponse qr(@PathVariable long id, @CurrentUser AppUser user) {
        return workflowService.handoffToken(id, user);
    }

    @PostMapping("/{id}/complete")
    public HelpRequestView complete(
            @PathVariable long id,
            @Valid @RequestBody CompleteHelpRequestRequest body,
            @CurrentUser AppUser user
    ) {
        return workflowService.complete(id, body.token(), user);
    }

    @PostMapping("/{id}/ratings")
    @ResponseStatus(HttpStatus.CREATED)
    public RatingResponse rate(
            @PathVariable long id,
            @Valid @RequestBody CreateRatingRequest body,
            @CurrentUser AppUser user
    ) {
        return workflowService.rate(id, body, user);
    }
}
