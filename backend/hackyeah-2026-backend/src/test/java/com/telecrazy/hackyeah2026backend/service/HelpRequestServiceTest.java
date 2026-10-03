package com.telecrazy.hackyeah2026backend.service;

import com.telecrazy.hackyeah2026backend.api.RoutePoint;
import com.telecrazy.hackyeah2026backend.api.RouteSearchRequest;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class HelpRequestServiceTest {

    private final HelpRequestService service = new HelpRequestService(
            mock(HelpRequestRepository.class),
            new LocationObfuscationService()
    );

    @Test
    void buildsLineStringWithLongitudeLatitudeOrder() {
        String lineString = service.toLineStringWkt(List.of(
                new RoutePoint(52.22977, 21.01178),
                new RoutePoint(52.23372, 21.01831)
        ));

        assertThat(lineString).isEqualTo("LINESTRING(21.01178 52.22977, 21.01831 52.23372)");
    }

    @Test
    void rejectsRouteWithFewerThanTwoPoints() {
        RouteSearchRequest request = new RouteSearchRequest(
                List.of(new RoutePoint(52.22977, 21.01178)),
                500
        );

        assertThatThrownBy(() -> service.findAlongRoute(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("route must contain at least 2 points");
    }

    @Test
    void rejectsInvalidCoordinates() {
        RouteSearchRequest request = new RouteSearchRequest(
                List.of(
                        new RoutePoint(52.22977, 21.01178),
                        new RoutePoint(91, 21.01831)
                ),
                500
        );

        assertThatThrownBy(() -> service.findAlongRoute(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("lat must be between -90 and 90");
    }

    @Test
    void rejectsInvalidBuffer() {
        RouteSearchRequest request = new RouteSearchRequest(
                List.of(
                        new RoutePoint(52.22977, 21.01178),
                        new RoutePoint(52.23372, 21.01831)
                ),
                25
        );

        assertThatThrownBy(() -> service.findAlongRoute(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("bufferMeters must be between 50 and 2000");
    }
}
