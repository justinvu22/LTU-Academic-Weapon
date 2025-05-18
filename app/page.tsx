// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { MdOutlineListAlt, MdOutlineWarningAmber, MdOutlineGavel, MdOutlinePersonOff } from 'react-icons/md';
import { Box, CircularProgress, Typography, Card, CardContent, Grid, Button, Paper } from '@mui/material';
import { ActivityList } from '../components/ActivityList';
import { policyIcons } from '../constants/policyIcons';
import { UserActivity } from '../types/activity';
import { generateStatistics, RISK_THRESHOLDS } from '../utils/dataProcessor';
import { useAdaptiveProcessing } from '../hooks/useAdaptiveProcessing';
import adaptiveConfig from '../utils/adaptiveConfig';
import Link from 'next/link';

export default function Page() {
  // State for activities and their statistics
  const [activities, setActivities] = useState<UserActivity[]>([]);
  
  // Stats data
  const [totalActivities, setTotalActivities] = useState(0);
  const [highRiskActivities, setHighRiskActivities] = useState(0);
  const [policyBreaches, setPolicyBreaches] = useState(0);
  const [usersAtRisk, setUsersAtRisk] = useState(0);
  const [averageRiskScore, setAverageRiskScore] = useState(0);
  
  // Most recent activities for quick view
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<string>('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Use the adaptive processing hook for optimized processing
  const adaptiveProcessing = useAdaptiveProcessing(activities.length > 0 ? activities : null);

  // Load activities from IndexedDB
  useEffect(() => {
    const loadActivitiesData = async () => {
      try {
        setLoading(true);
        setLoadingPhase('checking-storage');
        setLoadingProgress(10);
        
        // Load data from IndexedDB only
        const { getActivitiesFromIndexedDB } = await import('../utils/storage');
        let activitiesData: UserActivity[] = [];
        
        try {
          setLoadingPhase('loading-from-indexeddb');
          setLoadingProgress(20);
          activitiesData = await getActivitiesFromIndexedDB();
          console.log(`Loaded ${activitiesData.length} activities from IndexedDB`);
        } catch (storageError) {
          console.error('Error loading from IndexedDB:', storageError);
          setError('Error accessing data storage. Please try uploading data again.');
          setLoadingPhase('complete');
          setLoadingProgress(100);
          setLoading(false);
          return;
        }
        
        // If no data is found, show error message
        if (activitiesData.length === 0) {
          setError('No activity data found. Please upload data from the Upload page.');
          setLoadingPhase('complete');
          setLoadingProgress(100);
          setLoading(false);
          return;
        }
        
        // Process the data
        setLoadingPhase('processing-data');
        setLoadingProgress(70);
        
        // Set activities to trigger the adaptive processing
        setActivities(activitiesData);
        
        // Use our data processor to calculate statistics
        const statistics = generateStatistics(activitiesData);
        
        // Update state with statistics
        setTotalActivities(statistics.totalActivities);
        setHighRiskActivities(statistics.highRiskActivities);
        setPolicyBreaches(statistics.totalPolicyBreaches);
        setUsersAtRisk(statistics.usersAtRisk);
        setAverageRiskScore(statistics.averageRiskScore);
        
        // Sort activities by risk score (highest first)
        const sortedActivities = [...activitiesData].sort((a, b) => {
          // Sort by risk score as primary criteria
          return (b.riskScore || 0) - (a.riskScore || 0);
        });
        
        // Get the 5 activities with highest risk scores
        setRecentActivities(sortedActivities.slice(0, 5));
        
        setLoadingPhase('complete');
        setLoadingProgress(100);
      } catch (error) {
        console.error('Fatal error loading activities:', error);
        setError('Error loading activity data: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };
    
    // Initialize adaptive config and then load data
    adaptiveConfig.initialize().then(loadActivitiesData);
  }, []);

  // Custom loading indicator
  const renderLoadingIndicator = () => (
    <div className="flex flex-col justify-center items-center h-64">
      <CircularProgress variant="determinate" value={loadingProgress} size={60} />
      <div className="mt-4 text-gray-600">
        {loadingPhase === 'initializing' && 'Initializing application...'}
        {loadingPhase === 'checking-storage' && 'Checking data storage...'}
        {loadingPhase === 'loading-from-indexeddb' && 'Loading data from storage...'}
        {loadingPhase === 'processing-data' && 'Processing activity data...'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Home</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] w-full">
            <CircularProgress sx={{ color: '#8B5CF6' }} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {/* Total Activities */}
              <div className="flex items-center bg-[#1F2030] rounded-xl shadow-[inset_-4px_-4px_6px_#2a2a40,inset_4px_4px_6px_#0e0e1e] p-8 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 min-h-[8.5rem]">
                <MdOutlineListAlt className="text-5xl text-white/80 mr-6" />
                <div>
                  <div className="text-5xl font-bold text-white">{totalActivities}</div>
                  <div className="text-lg text-gray-400 mt-2">Total Activities</div>
                </div>
              </div>
              {/* High Risk Activities */}
              <div className="flex items-center bg-[#1F2030] rounded-xl shadow-[inset_-4px_-4px_6px_#2a2a40,inset_4px_4px_6px_#0e0e1e] p-8 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 min-h-[8.5rem]">
                <MdOutlineWarningAmber className="text-5xl mr-6 text-red-500" />
                <div>
                  <div className="text-5xl font-bold text-red-500">{highRiskActivities}</div>
                  <div className="text-lg text-gray-400 mt-2">High Risk Activities</div>
                </div>
              </div>
              {/* Policy Breaches */}
              <div className="flex items-center bg-[#1F2030] rounded-xl shadow-[inset_-4px_-4px_6px_#2a2a40,inset_4px_4px_6px_#0e0e1e] p-8 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 min-h-[8.5rem]">
                <MdOutlineGavel className="text-5xl text-pink-400 mr-6" />
                <div>
                  <div className="text-5xl font-bold text-pink-400">{policyBreaches}</div>
                  <div className="text-lg text-gray-400 mt-2">Recent Policy Breaches</div>
                </div>
              </div>
              {/* Users at Risk */}
              <div className="flex items-center bg-[#1F2030] rounded-xl shadow-[inset_-4px_-4px_6px_#2a2a40,inset_4px_4px_6px_#0e0e1e] p-8 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 min-h-[8.5rem]">
                <MdOutlinePersonOff className="text-5xl text-blue-400 mr-6" />
                <div>
                  <div className="text-5xl font-bold text-blue-400">{usersAtRisk}</div>
                  <div className="text-lg text-gray-400 mt-2">Users at Risk</div>
                </div>
              </div>
            </div>

            {/* AI Insights Banner */}
            <div className="bg-[#1F2030] border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] rounded-xl px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-extrabold mb-1 uppercase tracking-wide text-[#EEE]">AI-Powered Security Insights</h2>
                <p className="text-white/80">Get advanced ML-powered recommendations and security insights to protect your data.</p>
              </div>
              <Link href="/ml" passHref legacyBehavior>
                <Button
                  variant="contained"
                  sx={{ background: 'linear-gradient(90deg, #6E5FFE 0%, #A685FF 100%)', color: '#fff', fontWeight: 700, boxShadow: '0 2px 8px #6E5FFE22' }}
                >
                  View ML Insights
                </Button>
              </Link>
            </div>

            {/* Dashboard Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Link href="/dashboard" passHref legacyBehavior>
                <div className="bg-[#23243a] rounded-lg shadow-sm p-6 cursor-pointer transition-transform transform hover:scale-105">
                  <h2 className="text-xl font-bold mb-2 text-indigo-400">Advanced Dashboard</h2>
                  <p className="text-gray-400">View detailed analytics, visualizations, and user activity trends.</p>
                </div>
              </Link>
              <Link href="/upload" passHref legacyBehavior>
                <div className="bg-[#23243a] rounded-lg shadow-sm p-6 cursor-pointer transition-transform transform hover:scale-105">
                  <h2 className="text-xl font-bold mb-2 text-purple-400">Upload New Data</h2>
                  <p className="text-gray-400">Upload new activity data to analyze and monitor security threats.</p>
                </div>
              </Link>
            </div>

            {/* High-Risk Activities Section */}
            <div className="bg-[#23243a] rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-white">High-Risk Activities</h2>
              {recentActivities.length > 0 ? (
                <ActivityList
                  activities={recentActivities}
                  policyIcons={policyIcons}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {error ?
                    `Error loading activities: ${error}` :
                    'No high-risk activities found. Try uploading new data.'
                  }
                </div>
              )}
              <div className="mt-4 text-right">
                <Link href="/alerts?tab=2" passHref legacyBehavior>
                  <Button variant="outlined" sx={{ color: '#6E5FFE', borderColor: '#6E5FFE' }}>
                    View All Activities
                  </Button>
                </Link>
              </div>
            </div>

            {/* Performance Metrics (if available) */}
            {adaptiveProcessing.performanceMetrics && adaptiveProcessing.performanceMetrics.processingTime && (
              <div className="bg-[#23243a] rounded-lg shadow-sm p-4 text-xs text-gray-400 mb-6">
                <p>Data loaded in {adaptiveProcessing.performanceMetrics.processingTime.toFixed(2)}s • {adaptiveProcessing.performanceMetrics.adaptationsApplied?.join(' • ')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

