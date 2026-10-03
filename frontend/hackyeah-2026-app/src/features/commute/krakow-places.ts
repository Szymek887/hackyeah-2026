import type { RouteCoordinate } from '@/lib/route-matching';

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  coordinate: RouteCoordinate;
  type?: 'preset' | 'osm' | 'gps';
};

export const KRAKOW_PRESET_PLACES: PlaceSuggestion[] = [
  {
    id: 'cinema-bonarka',
    name: 'Cinema City Bonarka',
    address: 'ul. Henryka Kamieńskiego 11, Kraków (Bonarka City Center)',
    coordinate: { latitude: 50.0272, longitude: 19.9535 },
    type: 'preset',
  },
  {
    id: 'cinema-kazimierz',
    name: 'Cinema City Galeria Kazimierz',
    address: 'ul. Podgórska 34, Kraków',
    coordinate: { latitude: 50.0531, longitude: 19.9556 },
    type: 'preset',
  },
  {
    id: 'cinema-zakopianka',
    name: 'Cinema City Zakopianka',
    address: 'ul. Zakopiańska 62, Kraków (Park Handlowy Zakopianka)',
    coordinate: { latitude: 50.0142, longitude: 19.9312 },
    type: 'preset',
  },
  {
    id: 'cinema-plaza',
    name: 'Cinema City Plaza / Aleja Pokoju',
    address: 'al. Pokoju 44, Kraków',
    coordinate: { latitude: 50.0601, longitude: 19.9868 },
    type: 'preset',
  },
  {
    id: 'agh-glowny',
    name: 'AGH – Akademia Górniczo-Hutnicza',
    address: 'al. Adama Mickiewicza 30, Kraków (Budynek A-0)',
    coordinate: { latitude: 50.0647, longitude: 19.9234 },
    type: 'preset',
  },
  {
    id: 'uj-kampus',
    name: 'UJ – Kampus 600-lecia (Ruczaj)',
    address: 'ul. prof. Stanisława Łojasiewicza / Gronostajowa, Kraków',
    coordinate: { latitude: 50.0289, longitude: 19.9048 },
    type: 'preset',
  },
  {
    id: 'uj-centrum',
    name: 'UJ – Collegium Novum',
    address: 'ul. Gołębia 24, Kraków (Stare Miasto)',
    coordinate: { latitude: 50.0618, longitude: 19.9333 },
    type: 'preset',
  },
  {
    id: 'politechnika',
    name: 'Politechnika Krakowska',
    address: 'ul. Warszawska 24, Kraków',
    coordinate: { latitude: 50.0715, longitude: 19.9439 },
    type: 'preset',
  },
  {
    id: 'uek',
    name: 'Uniwersytet Ekonomiczny (UEK)',
    address: 'ul. Rakowicka 27, Kraków',
    coordinate: { latitude: 50.0685, longitude: 19.9546 },
    type: 'preset',
  },
  {
    id: 'dworzec-glowny',
    name: 'Dworzec Główny / Galeria Krakowska',
    address: 'ul. Pawia 5, Kraków',
    coordinate: { latitude: 50.0678, longitude: 19.9472 },
    type: 'preset',
  },
  {
    id: 'rynek-glowny',
    name: 'Rynek Główny',
    address: 'Rynek Główny, Kraków',
    coordinate: { latitude: 50.0619, longitude: 19.9373 },
    type: 'preset',
  },
  {
    id: 'kazimierz-plac-nowy',
    name: 'Kazimierz – Plac Nowy',
    address: 'Plac Nowy, Kraków (Kazimierz)',
    coordinate: { latitude: 50.0522, longitude: 19.9448 },
    type: 'preset',
  },
  {
    id: 'rondo-mogilskie',
    name: 'Rondo Mogilskie',
    address: 'Rondo Mogilskie (Węzeł przesiadkowy), Kraków',
    coordinate: { latitude: 50.0658, longitude: 19.9599 },
    type: 'preset',
  },
  {
    id: 'rondo-grunwaldzkie',
    name: 'Rondo Grunwaldzkie',
    address: 'Rondo Grunwaldzkie (Centrum ICE), Kraków',
    coordinate: { latitude: 50.0478, longitude: 19.9341 },
    type: 'preset',
  },
  {
    id: 'nowa-huta-plac-centralny',
    name: 'Nowa Huta – Plac Centralny',
    address: 'Plac Centralny im. Ronalda Reagana, Kraków',
    coordinate: { latitude: 50.0712, longitude: 20.0368 },
    type: 'preset',
  },
  {
    id: 'tauron-arena',
    name: 'Tauron Arena Kraków',
    address: 'ul. Stanisława Lema 7, Kraków',
    coordinate: { latitude: 50.0681, longitude: 19.9942 },
    type: 'preset',
  },
  {
    id: 'krowodrza-gorka',
    name: 'Krowodrza Górka P+R',
    address: 'ul. Krowoderskich Zuchów, Kraków',
    coordinate: { latitude: 50.0898, longitude: 19.9288 },
    type: 'preset',
  },
  {
    id: 'blonia',
    name: 'Błonia Krakowskie / Cichy Kącik',
    address: 'al. 3 Maja, Kraków',
    coordinate: { latitude: 50.0598, longitude: 19.9095 },
    type: 'preset',
  },
  {
    id: 'plac-inwalidow',
    name: 'Plac Inwalidów / Królewska',
    address: 'Plac Inwalidów, Kraków (Krowodrza)',
    coordinate: { latitude: 50.0707, longitude: 19.9255 },
    type: 'preset',
  },
  {
    id: 'plac-bohaterow-getta',
    name: 'Podgórze – Plac Bohaterów Getta',
    address: 'Plac Bohaterów Getta, Kraków',
    coordinate: { latitude: 50.0469, longitude: 19.9554 },
    type: 'preset',
  },
  {
    id: 'szpital-prokocim',
    name: 'Szpital Uniwersytecki Prokocim',
    address: 'ul. Jakubowskiego 2, Kraków',
    coordinate: { latitude: 50.0078, longitude: 20.0089 },
    type: 'preset',
  },
];

type PhotonFeature = {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

export async function searchKrakowPlaces(query: string): Promise<PlaceSuggestion[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return KRAKOW_PRESET_PLACES.slice(0, 8);
  }

  // 1. Instant local preset matching
  const matchedPresets = KRAKOW_PRESET_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(cleanQuery) || p.address.toLowerCase().includes(cleanQuery),
  );

  // 2. Fetch live OpenStreetMap suggestions via Photon (no API key needed)
  let osmSuggestions: PlaceSuggestion[] = [];
  if (cleanQuery.length >= 2) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        cleanQuery + ' Krakow',
      )}&lat=50.0614&lon=19.9366&limit=6`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as PhotonResponse;
        osmSuggestions = (data.features ?? [])
          .filter((f) => {
            const [lng, lat] = f.geometry.coordinates;
            // Bounding box around Krakow & surroundings
            return lat >= 49.9 && lat <= 50.2 && lng >= 19.7 && lng <= 20.2;
          })
          .map((f, idx): PlaceSuggestion => {
            const [lng, lat] = f.geometry.coordinates;
            const props = f.properties;
            const title =
              props.name ||
              (props.street ? `${props.street} ${props.housenumber ?? ''}`.trim() : 'Kraków');
            const addressParts = [
              props.street ? `${props.street} ${props.housenumber ?? ''}`.trim() : null,
              props.district,
              props.city || 'Kraków',
            ].filter(Boolean);

            return {
              id: `osm-${props.osm_id ?? idx}-${lat}-${lng}`,
              name: title,
              address: addressParts.join(', ') || 'Kraków',
              coordinate: { latitude: lat, longitude: lng },
              type: 'osm',
            };
          });
      }
    } catch {
      // Offline fallback: continue with local matches
    }
  }

  // Merge presets first, then OSM results (filtering duplicates by coordinate proximity)
  const allResults = [...matchedPresets];
  osmSuggestions.forEach((osm) => {
    const alreadyExists = allResults.some(
      (existing) =>
        Math.abs(existing.coordinate.latitude - osm.coordinate.latitude) < 0.001 &&
        Math.abs(existing.coordinate.longitude - osm.coordinate.longitude) < 0.001,
    );
    if (!alreadyExists) {
      allResults.push(osm);
    }
  });

  return allResults.slice(0, 10);
}
