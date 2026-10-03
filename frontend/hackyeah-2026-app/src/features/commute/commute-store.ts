import { useSyncExternalStore } from 'react';
import type { RouteCoordinate } from '@/lib/route-matching';
import { webStorage } from '@/lib/web-storage';

export type SavedCommuteRoute = {
  start: RouteCoordinate;
  end: RouteCoordinate;
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  isActive: boolean;
  updatedAt: string;
};

const STORAGE_KEY = 'podrodze.commuteRoute';

/**
 * The volunteer's commute route, shared by the route planner and the map tab. On web it is kept in
 * `localStorage`, so the map still shows it after a reload or a full-page navigation.
 */
let currentSavedRoute: SavedCommuteRoute | null = webStorage.read(STORAGE_KEY);
const listeners = new Set<() => void>();

function notify() {
  webStorage.write(STORAGE_KEY, currentSavedRoute);
  listeners.forEach((listener) => listener());
}

export const commuteStore = {
  getRoute(): SavedCommuteRoute | null {
    return currentSavedRoute;
  },

  setRoute(route: Omit<SavedCommuteRoute, 'updatedAt'> | null) {
    if (route === null) {
      currentSavedRoute = null;
    } else {
      currentSavedRoute = {
        ...route,
        updatedAt: new Date().toISOString(),
      };
    }
    notify();
  },

  toggleActive(active?: boolean) {
    if (!currentSavedRoute) return;
    currentSavedRoute = {
      ...currentSavedRoute,
      isActive: active !== undefined ? active : !currentSavedRoute.isActive,
    };
    notify();
  },

  clearRoute() {
    currentSavedRoute = null;
    notify();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSavedCommuteRoute() {
  const savedRoute = useSyncExternalStore(
    commuteStore.subscribe,
    commuteStore.getRoute,
    () => null,
  );

  return {
    savedRoute,
    setSavedRoute: commuteStore.setRoute,
    toggleRouteActive: commuteStore.toggleActive,
    clearSavedRoute: commuteStore.clearRoute,
  };
}
