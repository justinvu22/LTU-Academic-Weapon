// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { MdOutlineListAlt, MdOutlineWarningAmber, MdOutlineGavel, MdOutlinePersonOff } from 'react-icons/md';
import { Box, CircularProgress, Typography, Card, CardContent, Grid, Button, Paper } from '@mui/material';
import { ActivityList } from '../components/ActivityList';
import { policyIcons } from '../constants/policyIcons';
import { UserActivity } from '../types/activity';
import { generateStatistics, RISK_THRESHOLDS } from '../utils/dataProcessor';
import Link from 'next/link';

export default function Page() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats data
  const [totalActivities, setTotalActivities] = useState(0);
  const [highRiskActivities, setHighRiskActivities] = useState(0);
  const [policyBreaches, setPolicyBreaches] = useState(0);
  const [usersAtRisk, setUsersAtRisk] = useState(0);
  const [averageRiskScore, setAverageRiskScore] = useState(0);
  
  // Most recent activities for quick view
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);

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
        
        if (data.activities && data.activities.length > 0) {
          console.log(`Loaded ${data.activities.length} activities`);
          
          setActivities(data.activities);
          processData(data.activities);
          setError(null);
        } else {
          setActivities([]);
          setError('No activity data found');
        }
      } catch (err) {
        console.error('Error loading activities:', err);
        setError('Failed to load activities data');
        
        // Fallback to check localStorage if API fails
        try {
          const storedData = localStorage.getItem('processedActivityData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              console.log(`Loaded ${parsedData.length} activities from localStorage`);
              setActivities(parsedData);
              processData(parsedData);
              setError(null);
            }
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
  
  // Process summary data
  const processData = (activities: UserActivity[]) => {
    if (!activities || activities.length === 0) return;
    
    // Use our data processor to calculate statistics
    const statistics = generateStatistics(activities);
    
    // Update state with statistics
    setTotalActivities(statistics.totalActivities);
    setHighRiskActivities(statistics.highRiskActivities);
    setPolicyBreaches(statistics.totalPolicyBreaches);
    setUsersAtRisk(statistics.usersAtRisk);
    setAverageRiskScore(statistics.averageRiskScore);
    
    // Get most recent activities
    const sortedActivities = [...activities].sort((a, b) => {
      // Sort by timestamp if available
      if (a.timestamp && b.timestamp) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      // Fallback to risk score
      return (b.riskScore || 0) - (a.riskScore || 0);
    });
    
    setRecentActivities(sortedActivities.slice(0, 5));
  };

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
                <button className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white px-5 py-2 rounded-full font-semibold shadow-lg hover:scale-105 hover:shadow-pink-500/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400 animate-fadeIn">
                  View ML Insights
                </button>
              </Link>
            </div>

            {/* Dashboard Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/dashboard" passHref legacyBehavior>
                <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[inset_-4px_-4px_6px_#2a2a40,inset_4px_4px_6px_#0e0e1e] p-6 cursor-pointer hover:ring-2 hover:ring-purple-600 hover:scale-[1.02] transition-all duration-300 text-white">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Advanced Dashboard</h2>
                  <p className="text-white/70">View detailed analytics, visualizations, and user activity trends.</p>
                </div>
              </Link>
              <Link href="/upload" passHref legacyBehavior>
                <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[inset_-4px_-4px_6px_#2a2a40,inset_4px_4px_6px_#0e0e1e] p-6 cursor-pointer hover:ring-2 hover:ring-purple-600 hover:scale-[1.02] transition-all duration-300 text-white">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Upload New Data</h2>
                  <p className="text-white/70">Upload new activity data to analyze and monitor security threats.</p>
                </div>
              </Link>
            </div>

            {/* Recent Activities Section */}
            <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-inner p-6 mb-6">
              <h2 className="text-lg font-extrabold text-gray-300 uppercase tracking-wide mb-4">Recent Activities</h2>
              {recentActivities.length > 0 ? (
                <ActivityList 
                  activities={recentActivities} 
                  policyIcons={policyIcons}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent activities found.
                </div>
              )}
              <div className="mt-4 text-right">
                <Link href="/alerts?tab=2" passHref legacyBehavior>
                  <button className="bg-gradient-to-r from-[#8B5CF6] to-[#6E5FFE] text-white px-4 py-2 rounded-full font-semibold shadow-lg hover:scale-105 hover:shadow-purple-500/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 animate-fadeIn">
                    View All Activities
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

