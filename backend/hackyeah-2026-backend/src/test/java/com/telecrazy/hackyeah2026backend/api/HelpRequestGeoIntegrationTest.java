package com.telecrazy.hackyeah2026backend.api;

import com.jayway.jsonpath.JsonPath;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Runs public geo endpoints against the development PostGIS database.
 * Coordinates are near 0,0 so demo seed data does not affect the assertions.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class HelpRequestGeoIntegrationTest {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private HelpRequestRepository helpRequestRepository;

    private AppUser requester;

    @BeforeEach
    void setUp() {
        requester = userRepository.save(new AppUser("Geo Test", UserRole.REQUESTER, true, 50));
    }

    @Test
    void nearbyReturnsOnlyOpenRequestsWithinRadiusSortedByPriorityAndCreatedAt() throws Exception {
        save("Outside radius", HelpCategory.MEDICINE, 1, HelpRequestStatus.OPEN, 0.0200, 0.0000,
                Instant.parse("2030-01-01T10:00:00Z"));
        save("Accepted nearby", HelpCategory.MEDICINE, 1, HelpRequestStatus.ACCEPTED, 0.0005, 0.0005,
                Instant.parse("2030-01-01T10:00:00Z"));
        save("Older groceries", HelpCategory.GROCERIES, 2, HelpRequestStatus.OPEN, 0.0004, 0.0004,
                Instant.parse("2030-01-01T10:00:00Z"));
        save("Newer groceries", HelpCategory.GROCERIES, 2, HelpRequestStatus.OPEN, 0.0006, 0.0006,
                Instant.parse("2030-01-01T11:00:00Z"));
        save("Urgent medicine", HelpCategory.MEDICINE, 1, HelpRequestStatus.OPEN, 0.0008, 0.0008,
                Instant.parse("2030-01-01T09:00:00Z"));

        String json = mockMvc.perform(get("/api/help-requests/nearby")
                        .param("lat", "0")
                        .param("lng", "0")
                        .param("radiusKm", "1"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        List<String> titles = JsonPath.read(json, "$[*].title");
        assertThat(titles)
                .containsExactly("Urgent medicine", "Newer groceries", "Older groceries");
        assertThat(json)
                .doesNotContain("Outside radius")
                .doesNotContain("Accepted nearby")
                .doesNotContain("Privacy Street")
                .doesNotContain("\"street\"")
                .doesNotContain("\"buildingNumber\"")
                .doesNotContain("\"apartmentNumber\"")
                .doesNotContain("\"location\"");
        assertThat(JsonPath.<String>read(json, "$[0].approximateLocation.type")).isEqualTo("Point");
        assertThat(JsonPath.<String>read(json, "$[0].maskedArea.type")).isEqualTo("Polygon");
        assertThat(JsonPath.<List<?>>read(json, "$[0].maskedArea.coordinates[0]")).hasSize(5);
        Number approximateLng = JsonPath.read(json, "$[0].approximateLocation.coordinates[0]");
        Number approximateLat = JsonPath.read(json, "$[0].approximateLocation.coordinates[1]");
        assertThat(approximateLng.doubleValue())
                .isNotCloseTo(0.0008, offset(0.0000001));
        assertThat(approximateLat.doubleValue())
                .isNotCloseTo(0.0008, offset(0.0000001));
    }

    @Test
    void alongRouteReturnsOpenRequestsInsideRouteBufferOnly() throws Exception {
        save("On route", HelpCategory.HOME_SUPPORT, 2, HelpRequestStatus.OPEN, 0.0005, 0.0100,
                Instant.parse("2030-01-01T10:00:00Z"));
        save("Far from route", HelpCategory.HOME_SUPPORT, 1, HelpRequestStatus.OPEN, 0.0100, 0.0100,
                Instant.parse("2030-01-01T10:00:00Z"));
        save("Accepted on route", HelpCategory.HOME_SUPPORT, 1, HelpRequestStatus.ACCEPTED, 0.0004, 0.0100,
                Instant.parse("2030-01-01T10:00:00Z"));

        String json = mockMvc.perform(post("/api/help-requests/along-route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "points": [
                                    { "lat": 0.0, "lng": 0.0 },
                                    { "lat": 0.02, "lng": 0.0 }
                                  ],
                                  "bufferMeters": 200
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        List<String> titles = JsonPath.read(json, "$[*].title");
        assertThat(titles)
                .containsExactly("On route");
    }

    @Test
    void rejectsInvalidRouteRequests() throws Exception {
        mockMvc.perform(post("/api/help-requests/along-route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "points": [
                                    { "lat": 0.0, "lng": 0.0 }
                                  ],
                                  "bufferMeters": 200
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("route must contain at least 2 points"));

        mockMvc.perform(post("/api/help-requests/along-route")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "points": [
                                    { "lat": 0.0, "lng": 0.0 },
                                    { "lat": 0.02, "lng": 0.0 }
                                  ],
                                  "bufferMeters": 25
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("bufferMeters must be between 50 and 2000"));
    }

    @Test
    void rejectsInvalidNearbyCoordinates() throws Exception {
        mockMvc.perform(get("/api/help-requests/nearby")
                        .param("lat", "91")
                        .param("lng", "0")
                        .param("radiusKm", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("lat must be between -90 and 90"));
    }

    private HelpRequest save(
            String title,
            HelpCategory category,
            int priority,
            HelpRequestStatus status,
            double lng,
            double lat,
            Instant createdAt
    ) {
        HelpRequest request = new HelpRequest(
                requester,
                title,
                "Geo integration test request",
                category,
                priority,
                geometryFactory.createPoint(new Coordinate(lng, lat)),
                "Privacy Street",
                "42",
                "7"
        );
        request.setStatus(status);
        request.setCreatedAt(createdAt);
        request.setUpdatedAt(createdAt);
        return helpRequestRepository.saveAndFlush(request);
    }
}
