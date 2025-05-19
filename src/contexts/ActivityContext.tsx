import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserActivity } from '../../types/activity';

interface ActivityContextType {
  activities: UserActivity[];
  setActivities: React.Dispatch<React.SetStateAction<UserActivity[]>>;
  loading: boolean;
  error: string | null;
  refreshActivities: () => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivityContext = () => {
  const context = useContext(ActivityContext);
  if (!context) throw new Error('useActivityContext must be used within ActivityProvider');
  return context;
};

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/activities');
      if (!response.ok) throw new Error('Failed to fetch activities data');
      const data = await response.json();
      setActivities(data.activities || []);
      setError(null);
    } catch (err) {
      setError('Failed to load activities data. Please try uploading data from the Upload page.');
      try {
        const storedData = localStorage.getItem('processedActivityData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setActivities(Array.isArray(parsedData) ? parsedData : []);
          setError(null);
        }
      } catch (localErr) {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshActivities();
  }, []);

  return (
    <ActivityContext.Provider value={{ activities, setActivities, loading, error, refreshActivities }}>
      {children}
    </ActivityContext.Provider>
  );
}; 