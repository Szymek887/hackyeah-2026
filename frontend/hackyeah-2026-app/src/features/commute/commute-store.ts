import { useSyncExternalStore } from 'react';
import type { RouteCoordinate } from '@/lib/route-matching';

export type SavedCommuteRoute = {
  start: RouteCoordinate;
  end: RouteCoordinate;
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  isActive: boolean;
  updatedAt: string;
};

let currentSavedRoute: SavedCommuteRoute | null = null;
const listeners = new Set<() => void>();

function notify() {
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
  const savedRoute = useSyncExternalStore(commuteStore.subscribe, commuteStore.getRoute);

  return {
    savedRoute,
    setSavedRoute: commuteStore.setRoute,
    toggleRouteActive: commuteStore.toggleActive,
    clearSavedRoute: commuteStore.clearRoute,
  };
}
