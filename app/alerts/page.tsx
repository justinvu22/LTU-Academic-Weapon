"use client";

import React, { useEffect, useState } from 'react';
import { Typography, Box, Paper, CircularProgress, Tabs, Tab, Button } from '@mui/material';
import { ActivityList } from '../../components/ActivityList';
import { UserActivity } from '../../types/activity';
import { policyIcons } from '../../constants/policyIcons';
import '@fontsource/poppins/600.css';
import { FaSyncAlt } from 'react-icons/fa';

/**
 * Alerts page component that displays user activities and policy breaches
 */
export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

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

  useEffect(() => {
    fetchActivities();
  }, []);

  // Placeholder for custom alerts data
  const customAlerts: UserActivity[] = [];

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f3f4f6', fontFamily: 'Poppins, sans-serif' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 0, background: 'rgba(255,255,255,0.15)', borderRadius: 2, backdropFilter: 'blur(8px)' }}>
          <Tab label="Immediate review" sx={{ fontWeight: tab === 0 ? 700 : 400, minHeight: 0, minWidth: 120, color: tab === 0 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
          <Tab label="Custom alerts" sx={{ fontWeight: tab === 1 ? 700 : 400, minHeight: 0, minWidth: 120, color: tab === 1 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
          <Tab label="All other alerts" sx={{ fontWeight: tab === 2 ? 700 : 400, minHeight: 0, minWidth: 140, color: tab === 2 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
          <Tab label="Closed" sx={{ fontWeight: tab === 3 ? 700 : 400, minHeight: 0, minWidth: 100, color: tab === 3 ? '#232846' : '#6b7280', fontFamily: 'Poppins, sans-serif' }} />
        </Tabs>
        <Button onClick={fetchActivities} startIcon={<FaSyncAlt />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontFamily: 'Poppins, sans-serif', background: '#e5e7eb', color: '#232846', px: 3, py: 1.5, boxShadow: 1, ':hover': { background: '#d1d5db' } }}>
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
              Recent High-Risk Activities
            </Typography>
            <ActivityList 
              activities={activities.filter(a => a.riskScore >= 70).slice(0, 5)} 
              policyIcons={policyIcons}
            />
          </Paper>
          )}
          {tab === 1 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#232846', fontFamily: 'Poppins, sans-serif' }}>
                Custom Alerts
              </Typography>
              {/* TODO: Render custom alerts here */}
              {customAlerts.length === 0 ? (
                <Typography sx={{ fontFamily: 'Poppins, sans-serif' }}>No custom alerts yet. Alerts saved from the Custom Alerts page will appear here.</Typography>
              ) : (
                <ActivityList activities={customAlerts} policyIcons={policyIcons} />
              )}
            </Paper>
          )}
          {tab === 2 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(12px)', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 4px 32px 0 rgba(80,0,120,0.10)' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#232846', fontFamily: 'Poppins, sans-serif' }}>
              All Activities
            </Typography>
            <ActivityList 
              activities={activities} 
              policyIcons={policyIcons}
            />
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