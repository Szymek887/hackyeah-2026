package com.telecrazy.hackyeah2026backend.config;

import com.telecrazy.hackyeah2026backend.ai.MedicineRedaction;
import com.telecrazy.hackyeah2026backend.ai.RequestClassification;
import com.telecrazy.hackyeah2026backend.domain.AppUser;
import com.telecrazy.hackyeah2026backend.domain.HelpCategory;
import com.telecrazy.hackyeah2026backend.domain.HelpRequest;
import com.telecrazy.hackyeah2026backend.domain.HelpRequestStatus;
import com.telecrazy.hackyeah2026backend.domain.UserRole;
import com.telecrazy.hackyeah2026backend.repository.AppUserRepository;
import com.telecrazy.hackyeah2026backend.repository.HelpRequestRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

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

            AppUser anna = userRepository.save(user("Anna K.", UserRole.REQUESTER, true, true, 72, "pl"));
            AppUser marek = userRepository.save(user("Marek S.", UserRole.REQUESTER, true, false, 66, "pl", "en"));
            AppUser ewa = userRepository.save(user("Ewa P.", UserRole.REQUESTER, false, false, 45, "pl"));
            AppUser zofia = userRepository.save(user("Zofia M.", UserRole.REQUESTER, true, true, 81, "pl", "de"));
            AppUser jan = userRepository.save(user("Jan B.", UserRole.REQUESTER, true, false, 58, "pl"));
            AppUser halina = userRepository.save(user("Halina R.", UserRole.REQUESTER, true, true, 77, "pl", "ru"));
            AppUser piotr = userRepository.save(user("Piotr N.", UserRole.REQUESTER, false, false, 40, "pl", "uk"));
            AppUser maria = userRepository.save(user("Maria T.", UserRole.REQUESTER, true, false, 69, "pl", "en"));

            AppUser kuba = userRepository.save(user("Kuba W.", UserRole.VOLUNTEER, true, false, 91, "pl", "en", "uk"));
            AppUser ola = userRepository.save(user("Ola D.", UserRole.VOLUNTEER, true, false, 88, "pl", "en", "de"));
            AppUser bartek = userRepository.save(user("Bartek L.", UserRole.VOLUNTEER, true, false, 84, "pl", "en"));
            userRepository.save(user("Nadia P.", UserRole.VOLUNTEER, false, false, 63, "uk", "ru", "pl"));
            userRepository.save(user("Miasto Kraków", UserRole.CITY_ADMIN, true, false, 100, "pl", "en"));

            AppUser[] requesters = {anna, marek, ewa, zofia, jan, halina, piotr, maria};
            AppUser[] volunteers = {kuba, ola, bartek};

            seedRouteDemoRequests(helpRequestRepository, geometryFactory, anna, marek, zofia, kuba);
            seedCluster(
                    helpRequestRepository,
                    geometryFactory,
                    requesters,
                    volunteers,
                    "Stare Miasto",
                    19.9372,
                    50.0616,
                    new RequestTemplate[]{
                            new RequestTemplate("Odbior recepty z apteki", "Potrzebuje odebrac recepte i male opakowanie lekow z apteki przy rynku.", HelpCategory.MEDICINE, 2, "Florianska", "18"),
                            new RequestTemplate("Zakupy dla seniora", "Brakuje mi chleba, mleka i warzyw. Nie moge dzisiaj zejsc po schodach.", HelpCategory.GROCERIES, 2, "Slawkowska", "7"),
                            new RequestTemplate("Pomoc z cieknacym kranem", "W kuchni cieknie kran, potrzebna drobna pomoc albo sprawdzenie uszczelki.", HelpCategory.HOME_SUPPORT, 3, "Szewska", "12"),
                            new RequestTemplate("Towarzystwo na spacer", "Szukam kogos na krotki spacer po Plantach, najlepiej po poludniu.", HelpCategory.SOCIAL, 3, "Pijarska", "4"),
                            new RequestTemplate("Pozyczenie drabiny", "Potrzebuje pozyczyc mala drabine na godzine do wymiany zarowki.", HelpCategory.EQUIPMENT_LOAN, 3, "Grodzka", "31")
                    },
                    15
            );
            seedCluster(
                    helpRequestRepository,
                    geometryFactory,
                    requesters,
                    volunteers,
                    "Kazimierz",
                    19.9446,
                    50.0511,
                    new RequestTemplate[]{
                            new RequestTemplate("Pilne leki z apteki", "Koncza mi sie leki na cisnienie, potrzebuje odbioru jeszcze dzisiaj.", HelpCategory.MEDICINE, 1, "Miodowa", "22"),
                            new RequestTemplate("Podstawowe produkty", "Potrzebuje kilku zakupow: ryz, herbata, jogurt i owoce.", HelpCategory.GROCERIES, 2, "Starowislna", "46"),
                            new RequestTemplate("Naprawa zamka", "Zamek w drzwiach zacina sie i boje sie, ze nie wyjde rano.", HelpCategory.HOME_SUPPORT, 2, "Krakowska", "15"),
                            new RequestTemplate("Pozyczenie wiertarki", "Czy ktos moglby pozyczyc wiertarke na jeden wieczor?", HelpCategory.EQUIPMENT_LOAN, 3, "Szeroka", "9"),
                            new RequestTemplate("Rozmowa przy herbacie", "Czuje sie samotnie, chetnie porozmawiam z kims z okolicy.", HelpCategory.SOCIAL, 3, "Jozefa", "11")
                    },
                    14
            );
            seedCluster(
                    helpRequestRepository,
                    geometryFactory,
                    requesters,
                    volunteers,
                    "Krowodrza",
                    19.9244,
                    50.0702,
                    new RequestTemplate[]{
                            new RequestTemplate("Odbior lekow po drodze", "Potrzebuje odebrac leki z apteki na Krolewskiej.", HelpCategory.MEDICINE, 2, "Krolewska", "65"),
                            new RequestTemplate("Male zakupy spozywcze", "Prosze o zakup wody, pieczywa i kilku warzyw.", HelpCategory.GROCERIES, 2, "Lea", "19"),
                            new RequestTemplate("Pomoc z komputerem", "Komputer przestal laczyc sie z internetem, potrzebna pomoc techniczna.", HelpCategory.HOME_SUPPORT, 3, "Czarnowiejska", "48"),
                            new RequestTemplate("Pozyczenie klucza francuskiego", "Potrzebuje klucza francuskiego do dokrecenia zaworu.", HelpCategory.EQUIPMENT_LOAN, 3, "Mazowiecka", "34"),
                            new RequestTemplate("Wyjscie do przychodni", "Szukam osoby, ktora odprowadzi mnie do przychodni.", HelpCategory.SOCIAL, 2, "Urzędnicza", "21")
                    },
                    12
            );
            seedCluster(
                    helpRequestRepository,
                    geometryFactory,
                    requesters,
                    volunteers,
                    "Podgorze",
                    19.9521,
                    50.0436,
                    new RequestTemplate[]{
                            new RequestTemplate("Pilny zakup lekarstwa", "Lekarz zmienil dawkowanie, potrzebuje wykupic lek jeszcze dzisiaj.", HelpCategory.MEDICINE, 1, "Kalwaryjska", "32"),
                            new RequestTemplate("Zakupy po pracy", "Potrzebuje zakupow spozywczych, lista jest krotka.", HelpCategory.GROCERIES, 2, "Limanowskiego", "10"),
                            new RequestTemplate("Drobna awaria pradu", "Nie dziala jedno gniazdko w kuchni, prosze o sprawdzenie.", HelpCategory.HOME_SUPPORT, 2, "Zamoyskiego", "41"),
                            new RequestTemplate("Pozyczenie pompki", "Potrzebuje pompki rowerowej na dzisiejszy wieczor.", HelpCategory.EQUIPMENT_LOAN, 3, "Rynek Podgorski", "6"),
                            new RequestTemplate("Pomoc w wyniesieniu kartonow", "Mam kilka lekkich kartonow do przeniesienia do piwnicy.", HelpCategory.HOME_SUPPORT, 3, "Dlugosza", "18")
                    },
                    10
            );
            seedCluster(
                    helpRequestRepository,
                    geometryFactory,
                    requesters,
                    volunteers,
                    "Tauron Arena",
                    19.9942,
                    50.0681,
                    new RequestTemplate[]{
                            new RequestTemplate("Pozyczenie wiertarki udarowej", "Potrzebuje pozyczyc wiertarke udarowa do wywiercenia dwoch otworow w scianie.", HelpCategory.EQUIPMENT_LOAN, 3, "Stanislawa Lema", "7"),
                            new RequestTemplate("Pilne wydrukowanie dokumentow", "Zepsula mi sie drukarka, a musze pilnie wydrukowac 3 strony umowy i bilet.", HelpCategory.HOME_SUPPORT, 2, "Dabska", "12"),
                            new RequestTemplate("Pozyczenie soli i cukru", "Zabraklo mi soli i szklanki cukru do ciasta, a sklepy w okolicy sa juz zamkniete.", HelpCategory.GROCERIES, 3, "Aleja Pokoju", "44"),
                            new RequestTemplate("Pomoc w odbiorze przesylki", "Potrzebuje pomocy w odebraniu ciezkiej paczki z punktu przy Tauron Arenie.", HelpCategory.HOME_SUPPORT, 2, "Mogilska", "86")
                    },
                    8
            );
        };
    }

    private AppUser user(
            String displayName,
            UserRole role,
            boolean identityVerified,
            boolean specialNeeds,
            int trustScore,
            String... languages
    ) {
        AppUser user = new AppUser(displayName, role, identityVerified, specialNeeds, trustScore);
        user.replaceLanguages(List.of(languages));
        return user;
    }

    private void seedRouteDemoRequests(
            HelpRequestRepository helpRequestRepository,
            GeometryFactory geometryFactory,
            AppUser anna,
            AppUser marek,
            AppUser zofia,
            AppUser kuba
    ) {
        HelpRequest medicine = request(
                geometryFactory,
                anna,
                "Pilny odbior lekow na serce",
                "Skonczyly mi sie leki na serce, nie mam jak wyjsc z domu.",
                HelpCategory.MEDICINE,
                1,
                19.9389,
                50.0587,
                "Zwierzyniecka",
                "24",
                "8"
        );
        helpRequestRepository.save(medicine);

        helpRequestRepository.save(request(
                geometryFactory,
                marek,
                "Zakupy po drodze z pracy",
                "Potrzebuje kilku podstawowych produktow: chleb, mleko, jajka i warzywa.",
                HelpCategory.GROCERIES,
                2,
                19.9451,
                50.0643,
                "Basztowa",
                "10",
                "3"
        ));

        HelpRequest offered = request(
                geometryFactory,
                zofia,
                "Pomoc z torba po rehabilitacji",
                "Wracam z rehabilitacji i potrzebuje pomocy z lekka torba do mieszkania.",
                HelpCategory.HOME_SUPPORT,
                2,
                19.9556,
                50.0703,
                "Rakowicka",
                "20",
                "15"
        );
        offered.setStatus(HelpRequestStatus.OFFERED);
        offered.setVolunteer(kuba);
        helpRequestRepository.save(offered);
    }

    private void seedCluster(
            HelpRequestRepository helpRequestRepository,
            GeometryFactory geometryFactory,
            AppUser[] requesters,
            AppUser[] volunteers,
            String district,
            double centerLng,
            double centerLat,
            RequestTemplate[] templates,
            int count
    ) {
        for (int i = 0; i < count; i++) {
            RequestTemplate template = templates[i % templates.length];
            AppUser requester = requesters[i % requesters.length];
            double lng = centerLng + offset(i, 0.0011);
            double lat = centerLat + offset(i + 3, 0.0009);

            HelpRequest request = request(
                    geometryFactory,
                    requester,
                    template.title() + " - " + district,
                    template.description(),
                    template.category(),
                    template.priority(),
                    lng,
                    lat,
                    template.street(),
                    String.valueOf(Integer.parseInt(template.buildingNumber()) + i / templates.length),
                    i % 4 == 0 ? null : String.valueOf((i * 3) % 28 + 1)
            );

            if (i % 13 == 5) {
                request.setStatus(HelpRequestStatus.ACCEPTED);
                request.setVolunteer(volunteers[i % volunteers.length]);
            } else if (i % 11 == 4) {
                request.setStatus(HelpRequestStatus.COMPLETED);
                request.setVolunteer(volunteers[i % volunteers.length]);
            } else if (i % 7 == 3) {
                request.setStatus(HelpRequestStatus.OFFERED);
                request.setVolunteer(volunteers[i % volunteers.length]);
            }

            helpRequestRepository.save(request);
        }
    }

    private HelpRequest request(
            GeometryFactory geometryFactory,
            AppUser requester,
            String title,
            String description,
            HelpCategory category,
            int priority,
            double lng,
            double lat,
            String street,
            String buildingNumber,
            String apartmentNumber
    ) {
        // Same rule as for created requests: no medicine names or usage in stored text.
        boolean redact = MedicineRedaction.applies(category);
        return new HelpRequest(
                requester,
                redact ? MedicineRedaction.TITLE : title,
                redact ? MedicineRedaction.DESCRIPTION : description,
                category,
                redact ? RequestClassification.SPECIAL : priority,
                point(geometryFactory, lng, lat),
                street,
                buildingNumber,
                apartmentNumber
        );
    }

    private double offset(int index, double scale) {
        int row = index / 5;
        int column = index % 5;
        double base = (column - 2) * scale + (row % 3 - 1) * scale * 0.35;
        if (Math.abs(base) < scale * 0.45) {
            base = (index % 2 == 0 ? 1.4 : -1.4) * scale;
        }
        return base;
    }

    private org.locationtech.jts.geom.Point point(GeometryFactory geometryFactory, double lng, double lat) {
        return geometryFactory.createPoint(new Coordinate(lng, lat));
    }

    private record RequestTemplate(
            String title,
            String description,
            HelpCategory category,
            int priority,
            String street,
            String buildingNumber
    ) {
    }
}
