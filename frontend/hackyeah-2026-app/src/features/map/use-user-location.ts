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

/** A recent fix the phone already has is used at once (no waiting for a new GPS fix). */
const LAST_KNOWN_MAX_AGE_MS = 2 * 60_000;
const LAST_KNOWN_MIN_ACCURACY_METERS = 300;
/** Indoors a precise fix may never come – give up and retry with network accuracy. */
const PRECISE_FIX_TIMEOUT_MS = 10_000;
const ROUGH_FIX_TIMEOUT_MS = 8_000;

const km = (meters: number) => `${Math.round(meters / 1000)} km`;

/** Resolves to `null` when the promise fails or takes longer than `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Fastest reliable position: a fresh last-known fix, then a precise fix (GPS), then a rough one
 * (Wi-Fi / cell towers). `getCurrentPositionAsync` alone with the highest accuracy can wait for a
 * GPS signal for a very long time inside buildings, especially on Android.
 */
async function readPosition(): Promise<Location.LocationObject | null> {
  if (Platform.OS !== 'web') {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_MIN_ACCURACY_METERS,
    }).catch(() => null);
    if (lastKnown) return lastKnown;
  }
  return (
    (await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      PRECISE_FIX_TIMEOUT_MS,
    )) ??
    (await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      ROUGH_FIX_TIMEOUT_MS,
    ))
  );
}

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<RouteCoordinate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<RouteCoordinate | null> => {
    const fail = (message: string) => {
      setError(message);
      setIsLoading(false);
      return null;
    };

    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return fail(
          'Brak uprawnień do lokalizacji. Zezwól aplikacji na dostęp do lokalizacji w ustawieniach telefonu.',
        );
      }

      if (Platform.OS === 'android') {
        // Asks to turn on "precise location" (GPS + Wi-Fi + Google Play services). Declining is
        // fine – the position is then just less accurate.
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }
      if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) {
        return fail(
          'Lokalizacja w telefonie jest wyłączona. Włącz ją w ustawieniach albo wybierz miejsce ręcznie.',
        );
      }

      const position = await readPosition();
      if (!position) {
        return fail(
          'Nie udało się ustalić Twojej pozycji. Spróbuj przy oknie lub na zewnątrz albo wybierz miejsce ręcznie.',
        );
      }

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
        return fail(
          `Urządzenie podało pozycję ok. ${km(fromCentre)} od Krakowa` +
            (accuracy ? ` (dokładność ok. ${km(Math.max(accuracy, 1000))})` : '') +
            '. ' +
            (Platform.OS === 'web'
              ? 'Komputer bez GPS ustala lokalizację z sieci Wi-Fi, co bywa bardzo niedokładne. '
              : 'Sprawdź, czy GPS jest włączony. ') +
            'Wskaż swoje miejsce ręcznie.',
        );
      }

      setUserLocation(coords);
      setIsLoading(false);
      return coords;
    } catch {
      return fail(
        'Nie udało się pobrać pozycji GPS. Sprawdź, czy masz włączoną lokalizację w telefonie.',
      );
    }
  }, []);

  return {
    userLocation,
    isLoading,
    error,
    locate,
  };
}
