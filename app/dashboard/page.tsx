'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper, 
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import { UserActivity } from '../../types/activity';
import { ActivityList } from '../../components/ActivityList';
import { ActivityCharts } from '../../components/ActivityCharts';
import { AdvancedCharts } from '../../components/AdvancedCharts';
import { policyIcons } from '../../constants/policyIcons';

/**
 * Tab Panel component for Dashboard tabs
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Dashboard page with multiple views (Overview, Advanced Analytics, User Activity)
 */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        // Attempt to get data from API
        const response = await fetch('/api/activities');
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities data');
        }
        
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Error loading activities:', err);
        setError('Failed to load activities data. Please try uploading data from the Upload page.');
        
        // Fallback to check localStorage if API fails
        try {
          const storedData = localStorage.getItem('processedActivityData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            setActivities(Array.isArray(parsedData) ? parsedData : []);
            setError(null);
          }
        } catch (localErr) {
          console.error('Error loading from localStorage:', localErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Dashboard statistics
  const stats = {
    totalActivities: activities.length,
    highRiskActivities: activities.filter(a => a.riskScore >= 70).length,
    recentBreaches: calculateRecentBreaches(activities),
    usersAtRisk: calculateUsersAtRisk(activities)
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : activities.length === 0 ? (
          <Alert severity="info">
            No activity data available. Please navigate to the Upload page to provide data for analysis.
          </Alert>
        ) : (
          <>
            {/* Summary Cards */}
            <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#1e1a3c',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{stats.totalActivities}</Typography>
                <Typography variant="subtitle1">Total Activities</Typography>
              </Paper>
              
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#7e3af2',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{stats.highRiskActivities}</Typography>
                <Typography variant="subtitle1">High Risk Activities</Typography>
              </Paper>
              
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#ff5a8f',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{stats.recentBreaches}</Typography>
                <Typography variant="subtitle1">Recent Policy Breaches</Typography>
              </Paper>
              
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#2d7bf4',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{stats.usersAtRisk}</Typography>
                <Typography variant="subtitle1">Users at Risk</Typography>
              </Paper>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="Dashboard tabs">
                <Tab label="Overview" />
                <Tab label="Advanced Analytics" />
                <Tab label="User Activity" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <TabPanel value={activeTab} index={0}>
              <ActivityCharts activities={activities} />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <AdvancedCharts activities={activities} />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Typography variant="h6" gutterBottom>
                User Activity List
              </Typography>
              <ActivityList 
                activities={activities} 
                policyIcons={policyIcons}
              />
            </TabPanel>
          </>
        )}
      </Box>
    </Container>
  );
}

/**
 * Calculate recent policy breaches (last 7 days)
 */
function calculateRecentBreaches(activities: UserActivity[]): number {
  // Get date from 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Count breaches in recent activities
  let recentBreaches = 0;
  
  activities.forEach(activity => {
    // Try to get date from timestamp or date property
    let activityDate: Date | null = null;
    
    if (activity.timestamp) {
      activityDate = new Date(activity.timestamp);
    } else if (activity.date) {
      // Handle dates in format DD/MM/YYYY
      const parts = activity.date.split('/');
      if (parts.length === 3) {
        // Convert to YYYY-MM-DD format for Date constructor
        activityDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    
    // Skip if we couldn't parse the date
    if (!activityDate) return;
    
    // Check if activity is recent and has policy breaches
    if (activityDate >= sevenDaysAgo && activity.policiesBreached) {
      // Count each breach category
      Object.keys(activity.policiesBreached).forEach(category => {
        const breaches = activity.policiesBreached[category];
        if (Array.isArray(breaches)) {
          recentBreaches += breaches.length;
        } else if (breaches) {
          recentBreaches += 1;
        }
      });
    }
  });
  
  return recentBreaches;
}

/**
 * Calculate number of unique users with high risk activities
 */
function calculateUsersAtRisk(activities: UserActivity[]): number {
  // High risk threshold
  const riskThreshold = 70;
  
  // Get unique users with high risk activities
  const usersAtRisk = new Set<string>();
  
  activities.forEach(activity => {
    if (activity.riskScore >= riskThreshold) {
      // Use userId as the unique identifier
      const userId = activity.userId || activity.username || activity.user || '';
      if (userId) {
        usersAtRisk.add(userId);
      }
    }
  });
  
  return usersAtRisk.size;
} 