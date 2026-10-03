import { apiRequest } from '@/api/client';
import { USE_MOCKS } from '@/api/config';
import { mockResponse } from '@/api/mocks/delay';
import type { Category, HeatmapPoint } from '@/api/types';

export type DistrictStat = {
  name: string;
  total: number;
  completed: number;
  critical: number;
  topCategory: Category;
};

export type CityAnalyticsSummary = {
  totalRequests: number;
  completedRequests: number;
  inProgressRequests: number;
  activeVolunteers: number;
  avgResponseMinutes: number;
  co2SavedKg: number;
  satisfactionRate: number;
  categoryCounts: Record<Category, number>;
  districts: DistrictStat[];
};

const mockHeatmapPoints: HeatmapPoint[] = [
  // Stare Miasto / Długa / Floriańska / Grodzka
  { lat: 50.0647, lng: 19.945, weight: 0.9, category: 'BASIC_NEEDS' },
  { lat: 50.0652, lng: 19.9441, weight: 0.85, category: 'BASIC_NEEDS' },
  { lat: 50.0615, lng: 19.9372, weight: 0.7, category: 'SOCIAL' },
  { lat: 50.0585, lng: 19.9385, weight: 0.65, category: 'SOCIAL' },
  { lat: 50.063, lng: 19.94, weight: 0.8, category: 'BASIC_NEEDS' },
  { lat: 50.059, lng: 19.935, weight: 0.5, category: 'HOME_SUPPORT' },

  // Krowodrza / AGH / Czarnowiejska / Karmelicka
  { lat: 50.068, lng: 19.925, weight: 0.95, category: 'EQUIPMENT_LOAN' },
  { lat: 50.0665, lng: 19.919, weight: 0.8, category: 'BASIC_NEEDS' },
  { lat: 50.071, lng: 19.922, weight: 0.75, category: 'HOME_SUPPORT' },
  { lat: 50.064, lng: 19.921, weight: 0.6, category: 'EQUIPMENT_LOAN' },
  { lat: 50.0695, lng: 19.928, weight: 0.85, category: 'BASIC_NEEDS' },

  // Grzegórzki / Lubomirskiego / Mogilska / Rondo Mogilskie
  { lat: 50.0705, lng: 19.9555, weight: 0.75, category: 'HOME_SUPPORT' },
  { lat: 50.067, lng: 19.961, weight: 0.7, category: 'BASIC_NEEDS' },
  { lat: 50.0645, lng: 19.958, weight: 0.6, category: 'EQUIPMENT_LOAN' },
  { lat: 50.069, lng: 19.965, weight: 0.85, category: 'HOME_SUPPORT' },

  // Kazimierz / Podgórze / Kalwaryjska / Plac Nowy
  { lat: 50.0515, lng: 19.946, weight: 0.8, category: 'BASIC_NEEDS' },
  { lat: 50.049, lng: 19.944, weight: 0.7, category: 'SOCIAL' },
  { lat: 50.0545, lng: 19.9265, weight: 0.75, category: 'EQUIPMENT_LOAN' },
  { lat: 50.046, lng: 19.952, weight: 0.65, category: 'HOME_SUPPORT' },
  { lat: 50.044, lng: 19.948, weight: 0.7, category: 'BASIC_NEEDS' },

  // Dębniki / Rondo Grunwaldzkie / Kapelanka
  { lat: 50.048, lng: 19.931, weight: 0.6, category: 'EQUIPMENT_LOAN' },
  { lat: 50.043, lng: 19.925, weight: 0.7, category: 'BASIC_NEEDS' },
  { lat: 50.041, lng: 19.918, weight: 0.55, category: 'SOCIAL' },

  // Prądnik Czerwony / Biały
  { lat: 50.086, lng: 19.952, weight: 0.8, category: 'BASIC_NEEDS' },
  { lat: 50.089, lng: 19.945, weight: 0.65, category: 'HOME_SUPPORT' },
  { lat: 50.082, lng: 19.938, weight: 0.7, category: 'EQUIPMENT_LOAN' },
];

const mockAnalyticsSummary: CityAnalyticsSummary = {
  totalRequests: 86,
  completedRequests: 71,
  inProgressRequests: 9,
  activeVolunteers: 42,
  avgResponseMinutes: 17.5,
  co2SavedKg: 154.2,
  satisfactionRate: 98.4,
  categoryCounts: {
    BASIC_NEEDS: 38,
    HOME_SUPPORT: 23,
    EQUIPMENT_LOAN: 14,
    SOCIAL: 11,
  },
  districts: [
    {
      name: 'Stare Miasto',
      total: 31,
      completed: 27,
      critical: 12,
      topCategory: 'BASIC_NEEDS',
    },
    {
      name: 'Krowodrza',
      total: 24,
      completed: 20,
      critical: 8,
      topCategory: 'BASIC_NEEDS',
    },
    {
      name: 'Grzegórzki',
      total: 18,
      completed: 14,
      critical: 5,
      topCategory: 'HOME_SUPPORT',
    },
    {
      name: 'Podgórze',
      total: 13,
      completed: 10,
      critical: 4,
      topCategory: 'EQUIPMENT_LOAN',
    },
  ],
};

/** Get points for the city heatmap, optionally filtered by category. */
export async function getHeatmapData(category?: Category): Promise<HeatmapPoint[]> {
  if (USE_MOCKS) {
    const points = category
      ? mockHeatmapPoints.filter((p) => p.category === category)
      : mockHeatmapPoints;
    return mockResponse(points);
  }
  return apiRequest<HeatmapPoint[]>('/api/analytics/heatmap', {
    query: category ? { category } : undefined,
  });
}

/** Get aggregated city mobility & support indicators. */
export async function getCityAnalyticsSummary(): Promise<CityAnalyticsSummary> {
  if (USE_MOCKS) {
    return mockResponse(mockAnalyticsSummary);
  }
  return apiRequest<CityAnalyticsSummary>('/api/analytics/summary');
}
