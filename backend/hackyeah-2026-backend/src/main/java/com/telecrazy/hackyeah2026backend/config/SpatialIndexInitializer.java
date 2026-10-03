package com.telecrazy.hackyeah2026backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class SpatialIndexInitializer {

    @Bean
    ApplicationRunner createSpatialIndexes(JdbcTemplate jdbcTemplate) {
        return args -> jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_help_requests_location_gist
                ON help_requests
                USING GIST (location)
                """);
    }
}
