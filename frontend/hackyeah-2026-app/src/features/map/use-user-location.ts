import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { DEFAULT_CENTER, distanceMeters } from '@/lib/geo';
import type { RouteCoordinate } from '@/lib/route-matching';

/**
 * The app serves Kraków (MVP). A position further than this from the centre is treated as wrong:
 * computers without GPS get their position from Wi-Fi / IP databases, which can be off by hundreds
 * of kilometres (e.g. hackathon network gear registered in another town).
 */
const SERVICE_AREA_RADIUS_METERS = 30_000;

const km = (meters: number) => `${Math.round(meters / 1000)} km`;

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<RouteCoordinate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<RouteCoordinate | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg =
          'Brak uprawnień do lokalizacji. Zezwól aplikacji na dostęp do GPS w ustawieniach telefonu.';
        setError(msg);
        setIsLoading(false);
        return null;
      }

      // Highest accuracy: on phones this uses GPS instead of a rough network position.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const coords: RouteCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const fromCentre = distanceMeters(
        [coords.longitude, coords.latitude],
        [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      );
      if (fromCentre > SERVICE_AREA_RADIUS_METERS) {
        const accuracy = position.coords.accuracy;
        setError(
          `Urządzenie podało pozycję ok. ${km(fromCentre)} od Krakowa` +
            (accuracy ? ` (dokładność ok. ${km(Math.max(accuracy, 1000))})` : '') +
            '. ' +
            (Platform.OS === 'web'
              ? 'Komputer bez GPS ustala lokalizację z sieci Wi-Fi, co bywa bardzo niedokładne. '
              : 'Sprawdź, czy GPS jest włączony. ') +
            'Wskaż swoje miejsce ręcznie.',
        );
        setIsLoading(false);
        return null;
      }

      setUserLocation(coords);
      setIsLoading(false);
      return coords;
    } catch {
      const msg =
        'Nie udało się pobrać pozycji GPS. Sprawdź, czy masz włączoną lokalizację w telefonie.';
      setError(msg);
      setIsLoading(false);
      return null;
    }
  }, []);

  return {
    userLocation,
    isLoading,
    error,
    locate,
  };
}
