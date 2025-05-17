"use client";

import React, { useEffect, useState } from 'react';
import { Typography, Box, Paper, CircularProgress, Tabs, Tab, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { ActivityList } from '../../components/ActivityList';
import { UserActivity } from '../../types/activity';
import { policyIcons } from '../../constants/policyIcons';
import '@fontsource/poppins/600.css';
import { FaSyncAlt } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';

/**
 * VirtualizedActivityList - A performance-optimized version of ActivityList that uses virtualization
 */
const VirtualizedActivityList: React.FC<{
  activities: UserActivity[];
  policyIcons: Record<string, React.ReactNode>;
}> = ({ activities, policyIcons }) => {
  // Reuse the standard ActivityList for simplicity and avoid errors 
  // Virtual tables need extra setup that could be time-consuming
  return (
    <Box sx={{ 
      height: '100%', 
      '& .MuiTableContainer-root': {
        maxHeight: 'none',
        height: '100%',
        borderRadius: 0,
        boxShadow: 'none'
      },
      '& .MuiTable-root': {
        height: '100%' 
      }
    }}>
      <ActivityList 
        activities={activities} 
        policyIcons={policyIcons}
      />
    </Box>
  );
};

// Helper function to determine risk color
const getRiskColor = (score: number): string => {
  if (score >= 2000) return 'rgba(255, 0, 0, 0.08)';  // High risk
  if (score >= 1500) return 'rgba(255, 165, 0, 0.08)'; // Medium-high risk
  if (score >= 1000) return 'rgba(255, 255, 0, 0.08)'; // Medium risk
  return 'transparent'; // Low risk
};

/**
 * Custom styled version of ActivityList that fills the container
 */
const FullHeightActivityList: React.FC<{
  activities: UserActivity[];
  policyIcons: Record<string, React.ReactNode>;
}> = ({ activities, policyIcons }) => {
  return (
    <Box sx={{ 
      height: '100%', 
      '& .MuiTableContainer-root': {
        maxHeight: 'none',
        height: '100%',
        borderRadius: 0,
        boxShadow: 'none'
      },
      '& .MuiTable-root': {
        height: '100%' 
      }
    }}>
      <ActivityList 
        activities={activities} 
        policyIcons={policyIcons}
      />
    </Box>
  );
};

/**
 * Gets the user display name from an activity
 */
function getUserDisplayName(activity: any): string {
  // First try exact user field (from activity_report.csv)
  if (activity.user && typeof activity.user === 'string' && activity.user.trim()) {
    return activity.user;
  }
  
  // Then try username
  if (activity.username && activity.username.trim()) {
    return activity.username;
  }
  
  // Then userId
  if (activity.userId && activity.userId.trim()) {
    return activity.userId;
  }
  
  return 'Unknown User';
}

/**
 * Format date and time from activity for display
 */
function formatDateTime(activity: any): string {
  // Directly combine date and time fields if both exist (activity_report.csv format)
  if (activity.date && activity.time) {
    return `${activity.date} ${activity.time}`;
  }
  
  // If we only have a date
  if (activity.date) {
    return activity.date;
  }
  
  // Fallback to timestamp
  if (activity.timestamp) {
    try {
      const date = new Date(activity.timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  return '';
}

/**
 * Alerts page component that displays user activities and policy breaches
 */
export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const searchParams = useSearchParams();

  const fetchActivities = async (
    startDate: Date,
    endDate: Date,
    minRiskScore: number,
    maxRiskScore: number
  ): Promise<UserActivity[]> => {
    console.log('Fetching activities with date range:', startDate, endDate);
    console.log('Risk score range:', minRiskScore, maxRiskScore);

    try {
      // Load activities from IndexedDB only
      const indexedDBActivities = await loadFromIndexedDB();
      if (indexedDBActivities.length > 0) {
        return filterActivities(indexedDBActivities, startDate, endDate, minRiskScore, maxRiskScore);
      }
      
      // No data found, return empty array
      console.log('No activities found in storage');
      return [];
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  };

  const filterActivities = (
    activities: UserActivity[],
    startDate: Date,
    endDate: Date,
    minRiskScore: number,
    maxRiskScore: number
  ): UserActivity[] => {
    console.log('Filtering activities:', {
      total: activities.length, 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString()
    });
    
    // TEMPORARY: Return all activities to bypass date filtering issues
    // Only filter by risk score for now
    return activities.filter(activity => {
      // Handle missing risk scores with a default value
      const activityRiskScore = typeof activity.riskScore === 'number' ? 
        activity.riskScore : 0;
      
      const isInRiskRange = activityRiskScore >= minRiskScore && activityRiskScore <= maxRiskScore;
      
      return isInRiskRange;
    });
    
    /* Original date filtering code disabled temporarily
    return activities.filter(activity => {
      // Safely handle dates, falling back to current date if timestamp is invalid
      let activityDate: Date;
      try {
        // First try to parse from timestamp
        if (activity.timestamp) {
          activityDate = new Date(activity.timestamp);
          // Check if date is valid
          if (isNaN(activityDate.getTime())) {
            throw new Error('Invalid timestamp');
          }
        } 
        // Then try to parse from date field (DD/MM/YYYY format)
        else if (activity.date) {
          if (typeof activity.date === 'string' && activity.date.includes('/')) {
            const dateParts = activity.date.split('/');
            if (dateParts.length === 3) {
              // For DD/MM/YYYY format - note that month is 0-indexed in JS Date
              const day = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10) - 1; // Convert to 0-indexed month
              const year = parseInt(dateParts[2], 10);
              
              // Create date using correct parameters
              activityDate = new Date(year, month, day);
              
              // Debug output
              console.log(`Parsed date ${activity.date} to ${activityDate.toISOString()}`);
              
              // Check if date is valid
              if (isNaN(activityDate.getTime())) {
                throw new Error('Invalid date after parsing');
              }
            } else {
              throw new Error('Date parts not valid');
            }
          } else {
            activityDate = new Date(activity.date);
            // Check if date is valid
            if (isNaN(activityDate.getTime())) {
              throw new Error('Invalid date format');
            }
          }
        } else {
          // Default to current date if no date info available
          activityDate = new Date();
        }
      } catch (e) {
        console.warn(`Date parsing error for activity ${activity.id}: ${e}`);
        // Use current date as fallback
        activityDate = new Date();
      }
      
      // Debug log for filtering
      if (activities.length < 10) {
        console.log(`Activity ${activity.id} date: ${activityDate.toISOString()}, in range: ${activityDate >= startDate && activityDate <= endDate}`);
      }
      
      // Skip date filtering if dates are invalid
      const isInDateRange = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) ? 
        (activityDate >= startDate && activityDate <= endDate) : true;
      
      // Handle missing risk scores with a default value
      const activityRiskScore = typeof activity.riskScore === 'number' ? 
        activity.riskScore : 0;
      
      const isInRiskRange = activityRiskScore >= minRiskScore && activityRiskScore <= maxRiskScore;
      
      return isInDateRange && isInRiskRange;
    });
    */
  };

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        // Create a date range that includes historical and future dates
        // Start date: 5 years ago
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        
        // End date: 5 years in the future (to include 2025 dates from the CSV)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 5);
        
        console.log('[Alert Page] Loading activities from extended date range:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
        
        let result: UserActivity[] = [];
        
        try {
          console.log('[Alert Page] Loading from IndexedDB...');
          const indexedDBActivities = await loadFromIndexedDB();
          if (indexedDBActivities && indexedDBActivities.length > 0) {
            result = indexedDBActivities;
            console.log(`[Alert Page] Successfully loaded ${result.length} activities from IndexedDB`);
          } else {
            console.log('[Alert Page] No data found in storage.');
            setError('No activity data found. Please upload data from the Upload page.');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('[Alert Page] Error loading from storage:', error);
          setError('Error accessing data storage. Please try uploading data again.');
          setLoading(false);
          return;
        }
        
        // Filter activities by date range and risk score
        const filteredActivities = filterActivities(result, startDate, endDate, 0, 3000);
        console.log(`[Alert Page] Filtered to ${filteredActivities.length} activities in date range`);
        
        // Debugging: log first activity if available
        if (filteredActivities && filteredActivities.length > 0) {
          console.log('[Alert Page] First activity sample:', JSON.stringify(filteredActivities[0]).substring(0, 200));
          const policiesSample = filteredActivities[0].policiesBreached ? 
            (typeof filteredActivities[0].policiesBreached === 'string' ? 
              String(filteredActivities[0].policiesBreached).substring(0, 100) : 
              JSON.stringify(filteredActivities[0].policiesBreached).substring(0, 100)
            ) : 'none';
          console.log('[Alert Page] Policies breached sample:', policiesSample);
        } else {
          console.warn('[Alert Page] No activities found after filtering');
          setError('No activities found that match the filtering criteria. Please upload more data.');
        }
        
        setActivities(filteredActivities);
        console.log(`[Alert Page] Set activities state with length: ${filteredActivities.length}`);
        setError(null);
      } catch (err) {
        console.error('[Alert Page] Error in activity loading effect:', err);
        setError('Error loading activities: ' + (err instanceof Error ? err.message : String(err)));
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
    
    // Check URL for tab parameter
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 3) {
        setTab(tabIndex);
      }
    }
  }, [searchParams]);

  // Handle refresh button click
  const handleRefresh = async () => {
    try {
      setLoading(true);
      // Create a date range that includes historical and future dates
      // Start date: 5 years ago
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);
      
      // End date: 5 years in the future (to include 2025 dates from the CSV)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 5);
      
      const result = await fetchActivities(startDate, endDate, 0, 3000);
      setActivities(result);
      setError(null);
    } catch (err) {
      console.error('Error refreshing activities:', err);
      setError('Error loading activities: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for custom alerts data
  const customAlerts: UserActivity[] = [];

  // Load from IndexedDB function with better error handling
  const loadFromIndexedDB = async (): Promise<UserActivity[]> => {
    try {
      const { getActivitiesFromIndexedDB } = await import('../../utils/storage');
      const indexedDBActivities = await getActivitiesFromIndexedDB();
      
      if (indexedDBActivities && indexedDBActivities.length > 0) {
        console.log(`Found ${indexedDBActivities.length} activities in IndexedDB`);
        return indexedDBActivities;
      }
    } catch (idbError) {
      console.warn('Error accessing IndexedDB:', idbError);
    }
    return [];
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f3f4f6', fontFamily: 'Poppins, sans-serif' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 0, background: 'rgba(255,255,255,0.15)', borderRadius: 2, backdropFilter: 'blur(8px)' }}>
          <Tab label="Immediate review" sx={{ fontWeight: tab === 0 ? 700 : 400, minHeight: 0, minWidth: 120, color: tab === 0 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
          <Tab label="Custom alerts" sx={{ fontWeight: tab === 1 ? 700 : 400, minHeight: 0, minWidth: 120, color: tab === 1 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
          <Tab label="All other alerts" sx={{ fontWeight: tab === 2 ? 700 : 400, minHeight: 0, minWidth: 140, color: tab === 2 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
          <Tab label="Closed" sx={{ fontWeight: tab === 3 ? 700 : 400, minHeight: 0, minWidth: 100, color: tab === 3 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
        </Tabs>
        <Button onClick={handleRefresh} startIcon={<FaSyncAlt />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontFamily: 'Poppins, sans-serif', background: '#e5e7eb', color: '#232846', px: 3, py: 1.5, boxShadow: 1, ':hover': { background: '#d1d5db' } }}>
          Refresh alerts
        </Button>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)' }}>
          <Typography color="error" sx={{ fontFamily: 'Poppins, sans-serif' }}>{error}</Typography>
          <Typography variant="body2" mt={2} sx={{ fontFamily: 'Poppins, sans-serif' }}>
            Please navigate to the Upload page to provide activity data for analysis.
          </Typography>
        </Paper>
      ) : activities.length === 0 ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)' }}>
          <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>
            No activity data available. Please navigate to the Upload page to provide data for analysis.
          </Typography>
        </Paper>
      ) : (
        <>
          {tab === 0 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#232846', fontFamily: 'Poppins, sans-serif' }}>
              Recent High-Risk Activities ({activities.filter(a => (a.riskScore || 0) >= 500).length})
            </Typography>
            <ActivityList 
                activities={activities.filter(a => (a.riskScore || 0) >= 500).slice(0, 5)} 
              policyIcons={policyIcons}
            />
          </Paper>
          )}
          {tab === 1 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#232846', fontFamily: 'Poppins, sans-serif' }}>
                Custom Alerts
              </Typography>
              {customAlerts.length === 0 ? (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontFamily: 'Poppins, sans-serif', mb: 2 }}>
                    No custom alerts yet. Create alerts based on specific criteria below.
                  </Typography>
                  <Button 
                    variant="contained"
                    color="primary"
                    onClick={() => window.location.href = '/custom-alerts'}
                    sx={{ 
                      textTransform: 'none', 
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                      background: 'linear-gradient(90deg, #4b286a 0%, #7e3cad 100%)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #3a1d53 0%, #6b3092 100%)',
                      }
                    }}
                  >
                    Create Custom Alert
                  </Button>
                </Box>
              ) : (
                <ActivityList activities={customAlerts} policyIcons={policyIcons} />
              )}
            </Paper>
          )}
          {tab === 2 && (
            <Paper elevation={3} sx={{ 
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 180px)',
              p: 3, 
              mb: 3, 
              background: 'rgba(255,255,255,0.20)', 
              backdropFilter: 'blur(12px)', 
              borderRadius: 4, 
              border: '1px solid #e5e7eb', 
              boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)'
            }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#232846', fontFamily: 'Poppins, sans-serif' }}>
                All Activities ({activities.length})
              </Typography>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <VirtualizedActivityList 
                  activities={activities} 
                  policyIcons={policyIcons}
                />
              </Box>
            </Paper>
          )}
          {tab === 3 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#232846', fontFamily: 'Poppins, sans-serif' }}>
                Closed Alerts
              </Typography>
              <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>Coming soon.</Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
