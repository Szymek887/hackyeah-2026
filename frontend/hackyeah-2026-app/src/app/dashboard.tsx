import { CityDashboard } from '@/features/dashboard/city-dashboard';

/** City admin only (guarded in app/_layout.tsx). No tabs – the panel is the whole app for this role. */
export default function DashboardRoute() {
  return <CityDashboard />;
}
