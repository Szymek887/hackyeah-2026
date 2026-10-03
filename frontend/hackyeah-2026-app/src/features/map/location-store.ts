import { useSyncExternalStore } from 'react';

import type { RouteCoordinate } from '@/lib/route-matching';

export type SharedLocation = {
  label: string;
  coordinate: RouteCoordinate;
};

const DEFAULT_SHARED_LOCATION: SharedLocation = {
  label: 'Tauron Arena Kraków',
  coordinate: { latitude: 50.0681, longitude: 19.9942 },
};

let currentLocation = DEFAULT_SHARED_LOCATION;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentLocation;
}

export function setSharedLocation(location: SharedLocation) {
  currentLocation = location;
  listeners.forEach((listener) => listener());
}

export function useSharedLocation() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
