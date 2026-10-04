package com.telecrazy.hackyeah2026backend.analytics;

import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

/**
 * Aggregating queries for the city dashboard. Returns counts only, never individual requests.
 */
@Repository
public class AnalyticsRepository {

    /**
     * Latitude used to convert hexagon size from real metres to Web Mercator units. The MVP covers
     * Kraków only; a fixed value keeps the grid in the same place no matter which requests exist.
     */
    static final double REFERENCE_LATITUDE = 50.06;

    /**
     * Each request is assigned to the single hexagon of a global grid that contains it
     * ({@code ST_HexagonGrid} evaluated per point, so cost grows with the number of requests,
     * not with the covered area). The grid is built in Web Mercator (EPSG:3857); its units are
     * scaled by {@link #REFERENCE_LATITUDE} so that hexagons are close to the requested size in
     * real metres and stay in the same place regardless of filters and data.
     */
    private static final String HEATMAP_SQL = """
            SELECT h.i,
                   h.j,
                   ST_X(ST_Transform(ST_Centroid(h.geom), 4326)) AS center_lng,
                   ST_Y(ST_Transform(ST_Centroid(h.geom), 4326)) AS center_lat,
                   ST_AsGeoJSON(ST_Transform(h.geom, 4326), 6)   AS area,
                   r.category,
                   count(*)                                      AS cnt,
                   sum(4 - r.priority)                           AS weight,
                   count(*) FILTER (WHERE r.status = 'OPEN')     AS open_cnt
            FROM help_requests r
            CROSS JOIN LATERAL (
                SELECT g.i, g.j, g.geom
                FROM ST_HexagonGrid(:hexSizeMercator, ST_Transform(r.location, 3857)) g
                LIMIT 1
            ) h
            %s
            GROUP BY h.i, h.j, h.geom, r.category
            ORDER BY h.i, h.j, r.category
            """;

    private static final String SUMMARY_SQL = """
            SELECT r.category, r.status, r.priority, count(*) AS cnt
            FROM help_requests r
            %s
            GROUP BY r.category, r.status, r.priority
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public AnalyticsRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<HeatmapRow> heatmap(AnalyticsFilter filter, double hexSizeMeters) {
        double hexSizeMercator = hexSizeMeters / Math.cos(Math.toRadians(REFERENCE_LATITUDE));
        MapSqlParameterSource params = new MapSqlParameterSource("hexSizeMercator", hexSizeMercator);
        String sql = HEATMAP_SQL.formatted(where(filter, params));

        return jdbc.query(sql, params, (rs, rowNum) -> new HeatmapRow(
                rs.getLong("i"),
                rs.getLong("j"),
                rs.getDouble("center_lng"),
                rs.getDouble("center_lat"),
                rs.getString("area"),
                HelpCategory.valueOf(rs.getString("category")),
                rs.getLong("cnt"),
                rs.getLong("weight"),
                rs.getLong("open_cnt")
        ));
    }

    public List<SummaryRow> summary(AnalyticsFilter filter) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        String sql = SUMMARY_SQL.formatted(where(filter, params));

        return jdbc.query(sql, params, (rs, rowNum) -> new SummaryRow(
                HelpCategory.valueOf(rs.getString("category")),
                HelpRequestStatus.valueOf(rs.getString("status")),
                rs.getInt("priority"),
                rs.getLong("cnt")
        ));
    }

    private static String where(AnalyticsFilter filter, MapSqlParameterSource params) {
        List<String> conditions = new ArrayList<>();
        // Public endpoints: requests hidden from the public (e.g. suspected scams) are never counted,
        // even when such a status is requested explicitly.
        conditions.add("r.status NOT IN (:hiddenStatuses)");
        params.addValue("hiddenStatuses", HelpRequestStatus.HIDDEN_FROM_PUBLIC.stream().map(Enum::name).toList());
        if (filter.category() != null) {
            conditions.add("r.category = :category");
            params.addValue("category", filter.category().name());
        }
        if (!filter.statuses().isEmpty()) {
            conditions.add("r.status IN (:statuses)");
            params.addValue("statuses", filter.statuses().stream().map(Enum::name).toList());
        }
        if (filter.from() != null) {
            conditions.add("r.created_at >= :from");
            params.addValue("from", Timestamp.from(filter.from()));
        }
        if (filter.to() != null) {
            conditions.add("r.created_at < :to");
            params.addValue("to", Timestamp.from(filter.to()));
        }
        return "WHERE " + String.join(" AND ", conditions);
    }
}
