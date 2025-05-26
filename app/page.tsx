// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { MdOutlineListAlt, MdOutlineGavel, MdOutlinePersonOff, MdCloudUpload, MdDashboard } from 'react-icons/md';
import { CircularProgress, Button } from '@mui/material';
import { ActivityList } from '../components/ActivityList';
import { policyIcons } from '../constants/policyIcons';
import { UserActivity } from '../types/activity';
import { generateStatistics } from '../utils/dataProcessor';
import { useAdaptiveProcessing } from '../hooks/useAdaptiveProcessing';
import adaptiveConfig from '../utils/adaptiveConfig';
import Link from 'next/link';
import { FaMicrochip, FaSkull } from "react-icons/fa";

export default function Page() {
  // State for activities and their statistics
  const [activities, setActivities] = useState<UserActivity[]>([]);
  
  // Stats data
  const [totalActivities, setTotalActivities] = useState(0);
  const [highRiskActivities, setHighRiskActivities] = useState(0);
  const [policyBreaches, setPolicyBreaches] = useState(0);
  const [usersAtRisk, setUsersAtRisk] = useState(0);
  
  // Most recent activities for quick view
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the adaptive processing hook for optimized processing
  const adaptiveProcessing = useAdaptiveProcessing(activities.length > 0 ? activities : null);

  // Load activities from IndexedDB
  useEffect(() => {
    const loadActivitiesData = async () => {
      try {
        setLoading(true);
        
        // Load data from IndexedDB only
        const { getActivitiesFromIndexedDB } = await import('../utils/storage');
        let activitiesData: UserActivity[] = [];
        
        try {
          activitiesData = await getActivitiesFromIndexedDB();
          console.log(`Loaded ${activitiesData.length} activities from IndexedDB`);
        } catch (storageError) {
          console.error('Error loading from IndexedDB:', storageError);
          setError('Error accessing data storage. Please try uploading data again.');
          setLoading(false);
          return;
        }
        
        // If no data is found, show error message
        if (activitiesData.length === 0) {
          setError('No activity data found. Please upload data from the Upload page.');
          setLoading(false);
          return;
        }
        
        // Set activities to trigger the adaptive processing
        setActivities(activitiesData);
        
        // Use our data processor to calculate statistics
        const statistics = generateStatistics(activitiesData);
        
        // Update state with statistics
        setTotalActivities(statistics.totalActivities);
        setHighRiskActivities(statistics.highRiskActivities);
        setPolicyBreaches(statistics.totalPolicyBreaches);
        setUsersAtRisk(statistics.usersAtRisk);
        
        // Sort activities by risk score (highest first)
        const sortedActivities = [...activitiesData].sort((a, b) => {
          // Sort by risk score as primary criteria
          return (b.riskScore || 0) - (a.riskScore || 0);
        });
        
        // Get the 5 activities with highest risk scores
        setRecentActivities(sortedActivities.slice(0, 5));
        
        setLoading(false);
      } catch (error) {
        console.error('Fatal error loading activities:', error);
        setError('Error loading activity data: ' + (error instanceof Error ? error.message : String(error)));
      }
    };
    
    // Initialize adaptive config and then load data
    adaptiveConfig.initialize().then(loadActivitiesData);
  }, []);

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
            <div className="w-full">
              {/* Stats Cards Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12 w-full">
                {/* Total Activities */}
                <div className="flex items-center bg-white rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_rgba(255,255,255,0.35)] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg mr-6">
                    <MdOutlineListAlt className="text-4xl text-black drop-shadow" />
                  </div>
                  <div>
                    <div className="text-6xl font-extrabold text-[#232346] drop-shadow-lg leading-tight">{totalActivities}</div>
                    <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-[#444] opacity-90" style={{ letterSpacing: '0.12em' }}>Total Activities</div>
                  </div>
                </div>
                {/* High Risk Activities */}
                <div className="flex items-center bg-gradient-to-br from-[#FF3B3B] to-[#EC4899] rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_#FF3B3B44] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FF7B7B] to-[#FF3B3B] shadow-lg mr-6">
                    <FaSkull className="text-4xl text-white drop-shadow" />
                  </div>
                  <div>
                    <div className="text-6xl font-extrabold text-white drop-shadow-lg leading-tight">{highRiskActivities}</div>
                    <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-white opacity-90" style={{ letterSpacing: '0.12em' }}>High Risk Activities</div>
                  </div>
                </div>
                {/* Policy Breaches */}
                <div className="flex items-center bg-gradient-to-br from-[#7928CA] to-[#8B5CF6] rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_#7928CA44] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#A084E8] to-[#8B5CF6] shadow-lg mr-6">
                    <MdOutlineGavel className="text-4xl text-white drop-shadow" />
                  </div>
                  <div>
                    <div className="text-6xl font-extrabold text-white drop-shadow-lg leading-tight">{policyBreaches}</div>
                    <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-white opacity-90" style={{ letterSpacing: '0.12em' }}>Recent Policy Breaches</div>
                  </div>
                </div>
                {/* Users at Risk */}
                <div className="flex items-center bg-gradient-to-br from-[#f59e42] to-[#ff6a00] rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_#ff6a0044] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#f59e42] to-[#ff6a00] shadow-lg mr-6">
                    <MdOutlinePersonOff className="text-4xl text-white drop-shadow" />
                  </div>
                  <div>
                    <div className="text-6xl font-extrabold text-white drop-shadow-lg leading-tight">{usersAtRisk}</div>
                    <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-white opacity-90" style={{ letterSpacing: '0.12em' }}>Users at Risk</div>
                  </div>
                </div>
              </div>
              {/* Premium Divider */}
              <div className="w-full flex justify-center mb-12">
                <div className="h-1 w-full bg-[#23243a] rounded-full opacity-80"></div>
              </div>
            </div>

            {/* Move the lower section here, inside the same px-8 container */}
            {/* Dashboard Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              {/* Step 1: Upload CSV */}
              <div className="bg-[#23243a] rounded-2xl border border-[#2d2e44] p-8 flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#A084E8] to-[#6EE7F7] mb-6">
                  <MdCloudUpload className="text-white text-5xl" />
                </div>
                <h3 className="text-lg font-extrabold text-white uppercase tracking-wide mb-2">Step 1: Upload CSV</h3>
                <p className="text-white/80 font-medium">Upload your activity data to get started with analytics.</p>
              </div>
              {/* Step 2: View Dashboard */}
              <div className="bg-[#23243a] rounded-2xl border border-[#2d2e44] p-8 flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#6E5FFE] to-[#A084E8] mb-6">
                  <MdDashboard className="text-white text-5xl" />
                </div>
                <h3 className="text-lg font-extrabold text-white uppercase tracking-wide mb-2">Step 2: View Dashboard</h3>
                <p className="text-white/80 font-medium">See your security analytics and activity trends.</p>
              </div>
              {/* Step 3: View ML Suggestions */}
              <div className="bg-[#23243a] rounded-2xl border border-[#2d2e44] p-8 flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#6EE7F7] to-[#A084E8] mb-6">
                  <FaMicrochip className="text-white text-5xl" />
                </div>
                <h3 className="text-lg font-extrabold text-white uppercase tracking-wide mb-2">Step 3: View ML Suggestions</h3>
                <p className="text-white/80 font-medium">Unlock advanced AI-powered security recommendations.</p>
              </div>
            </div>
            {/* Ready to start banner */}
            <Link href="/upload" passHref legacyBehavior>
              <div className="w-full bg-[#18192b]/80 border-2 border-[#23243a] rounded-2xl px-8 py-6 text-white text-center font-extrabold text-2xl tracking-wide mb-8 cursor-pointer transition-all duration-200 hover:border-[#6EE7F7]">
                Ready to start?
              </div>
            </Link>

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

