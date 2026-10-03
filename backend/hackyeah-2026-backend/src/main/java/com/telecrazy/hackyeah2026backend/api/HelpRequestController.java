package com.telecrazy.hackyeah2026backend.api;

import com.telecrazy.hackyeah2026backend.auth.CurrentUser;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.service.HelpRequestDetailsService;
import com.telecrazy.hackyeah2026backend.service.HelpRequestService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/help-requests")
public class HelpRequestController {

    private final HelpRequestService helpRequestService;
    private final HelpRequestDetailsService helpRequestDetailsService;

    public HelpRequestController(
            HelpRequestService helpRequestService,
            HelpRequestDetailsService helpRequestDetailsService
    ) {
        this.helpRequestService = helpRequestService;
        this.helpRequestDetailsService = helpRequestDetailsService;
    }

    @GetMapping("/nearby")
    public List<PublicHelpRequestResponse> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "3") double radiusKm
    ) {
        return helpRequestService.findNearby(lat, lng, radiusKm);
    }

    @PostMapping("/along-route")
    public List<PublicHelpRequestResponse> alongRoute(@RequestBody RouteSearchRequest request) {
        return helpRequestService.findAlongRoute(request);
    }

    @PostMapping
    public ResponseEntity<FullHelpRequestResponse> create(
            @Valid @RequestBody CreateHelpRequestRequest body,
            @CurrentUser AppUser user
    ) {
        FullHelpRequestResponse created = helpRequestDetailsService.create(body, user);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    public HelpRequestView details(@PathVariable long id, @CurrentUser AppUser user) {
        return helpRequestDetailsService.getDetails(id, user);
    }
}
