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
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <div className="flex items-center justify-between mb-8 w-full">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Alerts</h1>
          <button
            onClick={fetchActivities}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#6E5FFE] to-[#8F7BFF] text-white font-bold px-7 py-3 rounded-xl shadow-lg hover:from-[#7C6BFF] hover:to-[#A89CFF] hover:scale-105 transition-all duration-150"
          >
            <FaSyncAlt className="text-lg" />
            Refresh Alerts
          </button>
        </div>

        <div className="relative z-10 mb-8">
          <div className="backdrop-blur-md bg-[#1F2030]/70 border border-white/10 rounded-xl shadow-lg px-4 py-2 flex items-center w-fit mx-auto w-full">
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              aria-label="Alerts tabs"
              TabIndicatorProps={{
                style: {
                  height: 6,
                  borderRadius: 6,
                  background: 'linear-gradient(90deg, #8B5CF6 0%, #6E5FFE 100%)',
                  boxShadow: '0 2px 12px #8B5CF655',
                  transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                }
              }}
              sx={{
                minHeight: 0,
                width: '100%',
                '.MuiTabs-flexContainer': { gap: 2 },
                '.MuiTab-root': {
                  color: '#BBB',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  px: 3,
                  py: 1.5,
                  borderRadius: '8px',
                  minHeight: 0,
                  transition: 'color 0.2s, background 0.2s',
                  fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                  '&.Mui-selected': {
                    color: '#EEE',
                    textShadow: '0 2px 12px #8B5CF655',
                    background: 'linear-gradient(90deg, #8B5CF6 0%, #6E5FFE 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  },
                  '&:hover': {
                    color: '#8B5CF6',
                    background: 'rgba(139,92,246,0.08)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #8B5CF6',
                    outlineOffset: '2px',
                  },
                },
              }}
            >
              <Tab label="Immediate review" />
              <Tab label="Custom alerts" />
              <Tab label="ALL ACTIVITY" />
              <Tab label="Closed" />
            </Tabs>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] w-full">
            <CircularProgress sx={{ color: '#8B5CF6' }} />
          </div>
        ) : error ? (
          <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
            <p className="text-red-400 font-semibold">{error}</p>
            <p className="text-gray-400 mt-4">
              Please navigate to the Upload page to provide activity data for analysis.
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
            <p className="text-gray-400">
              No activity data available. Please navigate to the Upload page to provide data for analysis.
            </p>
          </div>
        ) : (
          <>
            {tab === 0 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
                <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Recent High-Risk Activities</h2>
                <ActivityList 
                  activities={activities.filter(a => a.riskScore >= 70).slice(0, 5)} 
                  policyIcons={policyIcons}
                />
              </div>
            )}
            {tab === 1 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
                <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Custom Alerts</h2>
                {customAlerts.length === 0 ? (
                  <p className="text-gray-400">No custom alerts yet. Alerts saved from the Custom Alerts page will appear here.</p>
                ) : (
                  <ActivityList activities={customAlerts} policyIcons={policyIcons} />
                )}
              </div>
            )}
            {tab === 2 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 h-[calc(100vh-280px)] flex flex-col w-full">
                <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>All Activities</h2>
                <div className="flex-1 overflow-hidden">
                  <FullHeightActivityList 
                    activities={activities} 
                    policyIcons={policyIcons}
                  />
                </div>
              </div>
            )}
            {tab === 3 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
                <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Closed Alerts</h2>
                <ActivityList 
                  activities={activities.filter(a => a.status === 'closed')} 
                  policyIcons={policyIcons}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}