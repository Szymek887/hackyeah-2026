import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import type { RouteCoordinate } from '@/lib/route-matching';

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

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: RouteCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

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
