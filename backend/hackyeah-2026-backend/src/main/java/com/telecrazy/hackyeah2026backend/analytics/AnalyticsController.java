package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Set;

/**
 * City dashboard analytics. Responses contain aggregated counts only (no personal data, no exact locations),
 * so the endpoints are public.
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Requests grouped into hexagons, as a GeoJSON FeatureCollection.
     *
     * @param status         repeatable; defaults to statuses visible on the public map (excluding
     *                       {@code CANCELLED} and {@code UNDER_REVIEW})
     * @param cellSizeMeters hexagon side length, 500–5000; hexagons with fewer requests than
     *                       {@code app.analytics.min-cell-count} are left out
     */
    @GetMapping("/heatmap")
    public HeatmapResponse heatmap(
            @RequestParam(required = false) HelpCategory category,
            @RequestParam(required = false) Set<HelpRequestStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "" + AnalyticsService.DEFAULT_CELL_SIZE_METERS) int cellSizeMeters
    ) {
        return analyticsService.heatmap(new AnalyticsFilter(category, status, from, to), cellSizeMeters);
    }

    /**
     * Totals by status, category and priority.
     */
    @GetMapping("/summary")
    public SummaryResponse summary(
            @RequestParam(required = false) HelpCategory category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return analyticsService.summary(new AnalyticsFilter(category, null, from, to));
    }
}
