import { create } from 'zustand';
import { UserActivity, ActivityMetrics, MLRecommendation } from '../types/UserActivityType';

interface DashboardState {
  activities: UserActivity[];
  metrics: ActivityMetrics | null;
  recommendations: MLRecommendation[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setActivities: (activities: UserActivity[]) => void;
  setMetrics: (metrics: ActivityMetrics) => void;
  setRecommendations: (recommendations: MLRecommendation[]) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
}

const initialState = {
  activities: [],
  metrics: null,
  recommendations: [],
  dateRange: {
    start: null,
    end: null,
  },
  isLoading: false,
  error: null,
};

export const useStore = create<DashboardState>((set) => ({
  ...initialState,

  setActivities: (activities) => set({ activities }),
  setMetrics: (metrics) => set({ metrics }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setDateRange: (start, end) => set({ dateRange: { start, end } }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetStore: () => set(initialState),
})); 