import { metricsService, type Metrics } from '../services/metricsService';
import { useAsyncData } from './useAsyncData';

export function useMetrics() {
  return useAsyncData<Metrics>(() => metricsService.load());
}
