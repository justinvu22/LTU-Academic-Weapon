"use client";

import React, { useEffect, useState } from 'react';
import { Typography, Box, Paper, CircularProgress } from '@mui/material';
import { ActivityList } from '../../components/ActivityList';
import { UserActivity } from '../../types/activity';
import { policyIcons } from '../../constants/policyIcons';

/**
 * Alerts page component that displays user activities and policy breaches
 */
export default function AlertsPage() {
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Alert Dashboard
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#fff8e1' }}>
          <Typography color="error">{error}</Typography>
          <Typography variant="body2" mt={2}>
            Please navigate to the Upload page to provide activity data for analysis.
          </Typography>
        </Paper>
      ) : activities.length === 0 ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography>
            No activity data available. Please navigate to the Upload page to provide data for analysis.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent High-Risk Activities
            </Typography>
            <ActivityList 
              activities={activities.filter(a => a.riskScore >= 70).slice(0, 5)} 
              policyIcons={policyIcons}
            />
          </Paper>
          
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              All Activities
            </Typography>
            <ActivityList 
              activities={activities} 
              policyIcons={policyIcons}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
} 