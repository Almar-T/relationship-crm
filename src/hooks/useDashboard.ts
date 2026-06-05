import { dashboardService, type DashboardData } from '../services/dashboardService';
import { useAsyncData } from './useAsyncData';

export function useDashboard() {
  return useAsyncData<DashboardData>(() => dashboardService.load());
}
