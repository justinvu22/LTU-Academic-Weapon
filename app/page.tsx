// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { FaHome, FaFilter, FaExclamationTriangle, FaBell } from 'react-icons/fa';
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
    <div className="w-full min-h-screen bg-[#f8f8f8] text-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <CircularProgress />
        </div>
      ) : (
        <div>
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
                No recent activities found.
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
        </div>
      )}
    </div>
  );
}

