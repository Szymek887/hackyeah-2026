import { useCallback, useState } from 'react';
import type { RouteCoordinate } from '@/lib/route-matching';

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<RouteCoordinate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback((): Promise<RouteCoordinate | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const msg = 'Geolokalizacja nie jest dostępna na tym urządzeniu.';
        setError(msg);
        resolve(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLoading(false);
          const coords: RouteCoordinate = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          resolve(coords);
        },
        (err) => {
          setIsLoading(false);
          let msg = 'Nie udało się pobrać lokalizacji.';
          if (err.code === 1) {
            msg = 'Brak uprawnień do lokalizacji. Zezwól na dostęp w ustawieniach.';
          } else if (err.code === 2) {
            msg = 'Pozycja niedostępna.';
          } else if (err.code === 3) {
            msg = 'Przekroczono czas oczekiwania na pozycję GPS.';
          }
          setError(msg);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    });
  }, []);

  return {
    userLocation,
    isLoading,
    error,
    locate,
  };
}
