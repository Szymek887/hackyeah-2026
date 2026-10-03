package com.telecrazy.hackyeah2026backend.config;

import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseSeeder {

    private static final int WGS84 = 4326;

    @Bean
    CommandLineRunner seedDatabase(AppUserRepository userRepository, HelpRequestRepository helpRequestRepository) {
        return args -> {
            if (userRepository.count() > 0 || helpRequestRepository.count() > 0) {
                return;
            }

            GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), WGS84);

            AppUser anna = userRepository.save(new AppUser("Anna K.", UserRole.REQUESTER, true, true, 72));
            AppUser marek = userRepository.save(new AppUser("Marek S.", UserRole.REQUESTER, true, false, 66));
            AppUser ewa = userRepository.save(new AppUser("Ewa P.", UserRole.REQUESTER, false, false, 45));
            userRepository.save(new AppUser("Kuba W.", UserRole.VOLUNTEER, true, false, 91));
            userRepository.save(new AppUser("Miasto Warszawa", UserRole.CITY_ADMIN, true, false, 100));

            helpRequestRepository.save(new HelpRequest(
                    anna,
                    "Pilny odbior lekow",
                    "Skonczyly mi sie leki na serce i nie mam jak wyjsc z domu.",
                    HelpCategory.MEDICINE,
                    1,
                    point(geometryFactory, 21.01178, 52.22977),
                    "Marszalkowska",
                    "84",
                    "12"
            ));
            helpRequestRepository.save(new HelpRequest(
                    marek,
                    "Zakupy po drodze",
                    "Potrzebuje kilku podstawowych produktow ze sklepu: chleb, mleko i warzywa.",
                    HelpCategory.GROCERIES,
                    2,
                    point(geometryFactory, 21.01831, 52.23372),
                    "Swietokrzyska",
                    "18",
                    "7"
            ));
            helpRequestRepository.save(new HelpRequest(
                    ewa,
                    "Pozyczenie wiertarki",
                    "Czy ktos z okolicy moglby pozyczyc wiertarke na jeden wieczor?",
                    HelpCategory.EQUIPMENT_LOAN,
                    3,
                    point(geometryFactory, 20.99858, 52.23614),
                    "Zelazna",
                    "59",
                    null
            ));
        };
    }

    private org.locationtech.jts.geom.Point point(GeometryFactory geometryFactory, double lng, double lat) {
        return geometryFactory.createPoint(new Coordinate(lng, lat));
    }
}
