package com.telecrazy.hackyeah2026backend.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.locationtech.jts.geom.Point;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class JacksonGeometryConfig {

    @Bean
    SimpleModule jtsGeoJsonModule() {
        SimpleModule module = new SimpleModule("jts-geojson");
        module.addSerializer(Point.class, new PointGeoJsonSerializer());
        return module;
    }

    private static class PointGeoJsonSerializer extends JsonSerializer<Point> {

        @Override
        public void serialize(Point point, JsonGenerator generator, SerializerProvider serializers) throws IOException {
            generator.writeStartObject();
            generator.writeStringField("type", "Point");
            generator.writeArrayFieldStart("coordinates");
            generator.writeNumber(point.getX());
            generator.writeNumber(point.getY());
            generator.writeEndArray();
            generator.writeEndObject();
        }
    }
}
