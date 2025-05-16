"use client";

import React, { useEffect, useState } from 'react';
import { Typography, Box, Paper, CircularProgress, Tabs, Tab, Button, TableContainer, Table } from '@mui/material';
import { ActivityList } from '@components/ActivityList';
import { UserActivity } from '@types/activity';
import { policyIcons } from '@constants/policyIcons';
import '@fontsource/poppins/600.css';
import { FaSyncAlt } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';

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
 * Alerts page component that displays user activities and policy breaches
 */
export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const searchParams = useSearchParams();

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
    
    // Check URL for tab parameter
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 3) {
        setTab(tabIndex);
      }
    }
  }, [searchParams]);

  // Placeholder for custom alerts data
  const customAlerts: UserActivity[] = [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#7928CA] px-4 sm:px-8 md:px-12 py-12 font-poppins">
      {/* Main content with a small gap from the sidebar */}
      <div className="ml-6 w-full">
        <div className="flex items-center justify-between mb-8 w-full">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Alerts</h1>
          <button
            onClick={fetchActivities}
            className="inline-flex items-center gap-2 bg-[#1E1E2F] text-white font-semibold px-6 py-3 rounded-full shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <FaSyncAlt className="text-lg" />
            Refresh Alerts
          </button>
        </div>

        <div className="backdrop-blur-md bg-white/10 border border-white/10 shadow-lg rounded-2xl p-2 mb-8 w-full flex items-center">
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            className="min-h-0 w-full"
            TabIndicatorProps={{ style: { display: 'none' } }}
            sx={{
              width: '100%',
              '& .MuiTabs-flexContainer': {
                gap: '0.5rem',
              },
              '& .MuiTab-root': {
                color: '#c7bfff',
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '1.08rem',
                borderRadius: '9999px',
                minHeight: '44px',
                minWidth: '140px',
                px: 3,
                py: 1.5,
                transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                '&:hover': {
                  background: 'rgba(139,92,246,0.10)',
                  color: '#fff',
                  boxShadow: '0 2px 8px 0 rgba(139,92,246,0.10)'
                },
                '&.Mui-selected': {
                  background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: '0 4px 16px 0 rgba(139,92,246,0.15)',
                }
              }
            }}
          >
            <Tab label="Immediate review" />
            <Tab label="Custom alerts" />
            <Tab label="All other alerts" />
            <Tab label="Closed" />
          </Tabs>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] w-full">
            <CircularProgress sx={{ color: '#8B5CF6' }} />
          </div>
        ) : error ? (
          <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-8 w-full">
            <p className="text-red-400 font-semibold">{error}</p>
            <p className="text-gray-400 mt-4">
              Please navigate to the Upload page to provide activity data for analysis.
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-8 w-full">
            <p className="text-gray-400">
              No activity data available. Please navigate to the Upload page to provide data for analysis.
            </p>
          </div>
        ) : (
          <>
            {tab === 0 && (
              <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-8 w-full">
                <h2 className="text-xl font-semibold text-white mb-6">Recent High-Risk Activities</h2>
                <ActivityList 
                  activities={activities.filter(a => a.riskScore >= 70).slice(0, 5)} 
                  policyIcons={policyIcons}
                />
              </div>
            )}
            {tab === 1 && (
              <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-8 w-full">
                <h2 className="text-xl font-semibold text-white mb-6">Custom Alerts</h2>
                {customAlerts.length === 0 ? (
                  <p className="text-gray-400">No custom alerts yet. Alerts saved from the Custom Alerts page will appear here.</p>
                ) : (
                  <ActivityList activities={customAlerts} policyIcons={policyIcons} />
                )}
              </div>
            )}
            {tab === 2 && (
              <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-8 h-[calc(100vh-280px)] flex flex-col w-full">
                <h2 className="text-xl font-semibold text-white mb-6">All Activities</h2>
                <div className="flex-1 overflow-hidden">
                  <FullHeightActivityList 
                    activities={activities} 
                    policyIcons={policyIcons}
                  />
                </div>
              </div>
            )}
            {tab === 3 && (
              <div className="bg-[#1E1E2F] rounded-2xl shadow-[inset_-4px_-4px_8px_#2a2a40,inset_4px_4px_8px_#0e0e1e] p-8 mb-8 w-full">
                <h2 className="text-xl font-semibold text-white mb-6">Closed Alerts</h2>
                <p className="text-gray-400">Coming soon.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}