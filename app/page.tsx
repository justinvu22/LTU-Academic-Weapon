// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { FaHome, FaFilter, FaExclamationTriangle, FaBell } from 'react-icons/fa';
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
        
        // Get most recent activities
        const sortedActivities = [...activitiesData].sort((a, b) => {
          // Sort by timestamp if available
          if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          }
          // Fallback to risk score
          return (b.riskScore || 0) - (a.riskScore || 0);
        });
        
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
    <div className="w-full min-h-screen bg-[#f8f8f8] text-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      {loading || loadingProgress < 100 ? (
        renderLoadingIndicator()
      ) : (
        <div>
          {error ? (
            <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p>{error}</p>
              <div className="mt-4">
                <Link href="/upload" passHref>
                  <Button variant="contained" color="primary">
                    Upload Data
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Cards Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-900 text-white p-6 rounded shadow-sm flex flex-col items-center">
                  <div className="text-6xl font-bold">{totalActivities}</div>
                  <div className="mt-2 text-center">Total Activities</div>
                </div>
                
                <div className="bg-purple-600 text-white p-6 rounded shadow-sm flex flex-col items-center">
                  <div className="text-6xl font-bold">{highRiskActivities}</div>
                  <div className="mt-2 text-center">High Risk Activities</div>
                </div>
                
                <div className="bg-pink-500 text-white p-6 rounded shadow-sm flex flex-col items-center">
                  <div className="text-6xl font-bold">{policyBreaches}</div>
                  <div className="mt-2 text-center">Recent Policy Breaches</div>
                </div>
                
                <div className="bg-blue-500 text-white p-6 rounded shadow-sm flex flex-col items-center">
                  <div className="text-6xl font-bold">{usersAtRisk}</div>
                  <div className="mt-2 text-center">Users at Risk</div>
                </div>
              </div>

              {/* ML Insights Banner */}
              <div className="mb-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-2">AI-Powered Security Insights</h2>
                      <p className="text-white text-opacity-90">
                        Get advanced ML-powered recommendations and security insights to protect your data.
                      </p>
                    </div>
                    <Link href="/ml" passHref>
                      <Button 
                        variant="contained" 
                        className="bg-white text-indigo-600 hover:bg-gray-100"
                      >
                        View ML Insights
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Dashboard Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Link href="/dashboard" passHref>
                  <div className="bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-transform transform hover:scale-105">
                    <h2 className="text-xl font-bold mb-2 text-indigo-600">Advanced Dashboard</h2>
                    <p className="text-gray-600">
                      View detailed analytics, visualizations, and user activity trends.
                    </p>
                  </div>
                </Link>
                <Link href="/upload" passHref>
                  <div className="bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-transform transform hover:scale-105">
                    <h2 className="text-xl font-bold mb-2 text-purple-600">Upload New Data</h2>
                    <p className="text-gray-600">
                      Upload new activity data to analyze and monitor security threats.
                    </p>
                  </div>
                </Link>
              </div>
              
              {/* Recent Activities Section */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Recent Activities</h2>
                {recentActivities.length > 0 ? (
                  <ActivityList 
                    activities={recentActivities} 
                    policyIcons={policyIcons}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {error ? 
                      `Error loading activities: ${error}` :
                      'No recent activities found. Try uploading new data.'
                    }
                  </div>
                )}
                <div className="mt-4 text-right">
                  <Link href="/alerts?tab=2" passHref>
                    <Button variant="outlined" color="primary">
                      View All Activities
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Performance Metrics (if available) */}
              {adaptiveProcessing.performanceMetrics && adaptiveProcessing.performanceMetrics.processingTime && (
                <div className="bg-white rounded-lg shadow-sm p-4 text-xs text-gray-500 mb-6">
                  <p>Data loaded in {adaptiveProcessing.performanceMetrics.processingTime.toFixed(2)}s • {adaptiveProcessing.performanceMetrics.adaptationsApplied?.join(' • ')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

