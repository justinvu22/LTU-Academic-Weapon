// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { FaHome, FaFilter, FaEllipsisV, FaSun, FaCloud, FaUsb, FaRegWindowRestore, FaExclamationTriangle, FaBell } from 'react-icons/fa';
import { Box, CircularProgress, Typography, Card, CardContent, Grid, Chip, Tooltip as MuiTooltip, Paper, Button } from '@mui/material';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ActivityList } from '../components/ActivityList';
import { policyIcons } from '../constants/policyIcons';
import { UserActivity, MLRecommendation } from '../types/activity';
import { generateStatistics, RISK_THRESHOLDS } from '../utils/dataProcessor';
import Link from 'next/link';

export default function Page() {
  const [filters, setFilters] = useState({
    target: "All Targets",
    label: "All Labels",
    team: "All Teams",
    severity: "All Severities"
  });
  
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ML recommendation state
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([]);
  
  // Stats data
  const [totalActivities, setTotalActivities] = useState(0);
  const [highRiskActivities, setHighRiskActivities] = useState(0);
  const [policyBreaches, setPolicyBreaches] = useState(0);
  const [usersAtRisk, setUsersAtRisk] = useState(0);
  const [averageRiskScore, setAverageRiskScore] = useState(0);
  
  // Distribution data
  const [riskDistribution, setRiskDistribution] = useState<{name: string, count: number, color: string}[]>([]);
  const [integrationDistribution, setIntegrationDistribution] = useState<{name: string, count: number, color: string}[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{name: string, count: number, color: string}[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<{name: string, count: number, color: string}[]>([]);
  
  // Chart data states (for existing charts)
  const [riskTrendData, setRiskTrendData] = useState<any[]>([]);
  const [severityTrendData, setSeverityTrendData] = useState<any[]>([]);
  const [policyBreachData, setPolicyBreachData] = useState<any[]>([]);
  const [integrationData, setIntegrationData] = useState<any[]>([]);
  const [usersNeedingAttention, setUsersNeedingAttention] = useState<any[]>([]);
  
  // Colors for risk levels, status, etc.
  const COLORS = {
    risk: {
      low: '#4caf50',
      medium: '#2196f3',
      high: '#ff9800',
      critical: '#f44336',
    },
    status: {
      underReview: '#2196f3',
      trusted: '#4caf50',
      concern: '#ff9800',
      nonConcern: '#9e9e9e'
    },
    time: {
      morning: '#2196f3',
      afternoon: '#4caf50',
      evening: '#ff9800'
    },
    integration: {
      email: '#2196f3',
      cloud: '#673ab7',
      usb: '#ff5722',
      application: '#009688'
    }
  };

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
          // Check sample activity to ensure fields are present
          if (data.activities.length > 0) {
            console.log('Sample activity:', data.activities[0]);
          }
          
          setActivities(data.activities);
          processAllData(data.activities);
          
          // For ML recommendations, we now direct users to dedicated ML page
          // This keeps home page focused on overview metrics
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
              processAllData(parsedData);
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
  
  // Process all data metrics and statistics
  const processAllData = (activities: UserActivity[]) => {
    if (!activities || activities.length === 0) {
      resetAllData();
      return;
    }
    
    // Use our data processor to calculate statistics
    const statistics = generateStatistics(activities);
    
    // Update state with statistics
    setTotalActivities(statistics.totalActivities);
    setHighRiskActivities(statistics.highRiskActivities);
    setPolicyBreaches(statistics.totalPolicyBreaches);
    setUsersAtRisk(statistics.usersAtRisk);
    setAverageRiskScore(statistics.averageRiskScore);
    
    // Risk distribution
    const riskCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    activities.forEach(activity => {
      const score = activity.riskScore || 0;
      if (score < RISK_THRESHOLDS.LOW) riskCounts.low++;
      else if (score < RISK_THRESHOLDS.MEDIUM) riskCounts.medium++;
      else if (score < RISK_THRESHOLDS.HIGH) riskCounts.high++;
      else riskCounts.critical++;
    });
    
    setRiskDistribution([
      { name: 'Low', count: riskCounts.low, color: COLORS.risk.low },
      { name: 'Medium', count: riskCounts.medium, color: COLORS.risk.medium },
      { name: 'High', count: riskCounts.high, color: COLORS.risk.high },
      { name: 'Critical', count: riskCounts.critical, color: COLORS.risk.critical }
    ]);
    
    // Integration distribution 
    setIntegrationDistribution(
      Object.entries(statistics.integrationDistribution).map(([name, count]) => {
        let color = '#9e9e9e'; // default
        if (name === 'email') color = COLORS.integration.email;
        else if (name === 'cloud') color = COLORS.integration.cloud;
        else if (name === 'usb') color = COLORS.integration.usb;
        else if (name === 'application') color = COLORS.integration.application;
        
        return { name, count, color };
      })
    );
    
    // Status distribution
    const statusCounts = {
      underReview: 0,
      trusted: 0, 
      concern: 0,
      nonConcern: 0
    };
    
    activities.forEach(activity => {
      const status = activity.status || 'underReview';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.underReview++;
      }
    });
    
    setStatusDistribution(
      Object.entries(statusCounts).map(([name, count]) => {
        let color = '#9e9e9e'; // default
        let displayName = name;
        
        if (name === 'underReview') {
          color = COLORS.status.underReview;
          displayName = 'Under Review';
        }
        else if (name === 'trusted') {
          color = COLORS.status.trusted;
          displayName = 'Trusted';
        }
        else if (name === 'concern') {
          color = COLORS.status.concern;
          displayName = 'Concern';
        }
        else if (name === 'nonConcern') {
          color = COLORS.status.nonConcern;
          displayName = 'Non-Concern';
        }
        
        return { name: displayName, count, color };
      })
    );
    
    // Time distribution
    setTimeDistribution([
      { name: 'Morning', count: statistics.timeDistribution.morning, color: COLORS.time.morning },
      { name: 'Afternoon', count: statistics.timeDistribution.afternoon, color: COLORS.time.afternoon },
      { name: 'Evening', count: statistics.timeDistribution.evening, color: COLORS.time.evening }
    ]);
    
    // Process data for existing charts
    setRiskTrendData(calculateActivityOverTime(activities));
    setSeverityTrendData(calculateSeverityTrend(activities));
    setPolicyBreachData(calculatePolicyBreaches(activities));
    setIntegrationData(calculateIntegrationBreakdown(activities));
    setUsersNeedingAttention(calculateUsersAtRisk(activities));
  };

  // Reset all data when no activities are available
  const resetAllData = () => {
    setTotalActivities(0);
    setHighRiskActivities(0);
    setPolicyBreaches(0);
    setUsersAtRisk(0);
    setAverageRiskScore(0);
    setRiskDistribution([]);
    setIntegrationDistribution([]);
    setStatusDistribution([]);
    setTimeDistribution([]);
    setRiskTrendData([]);
    setSeverityTrendData([]);
    setPolicyBreachData([]);
    setIntegrationData([]);
    setUsersNeedingAttention([]);
    setRecommendations([]);
  };

  // Render progress bars for distribution data
  const renderDistributionBars = (data: {name: string, count: number, color: string}[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{item.name}</span>
              <span>({item.count})</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full" 
                style={{ 
                  width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                  backgroundColor: item.color
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
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

          {/* Distribution Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-gray-900 p-4 rounded-lg">
            {/* Total Activities Card */}
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Activities</h3>
              <div className="text-3xl font-bold">{totalActivities}</div>
            </div>
            
            {/* Average Risk Score Card */}
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Average Risk Score</h3>
              <div className="text-3xl font-bold">{averageRiskScore}</div>
            </div>
            
            {/* Risk Distribution Card */}
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Risk Score Distribution</h3>
              {renderDistributionBars(riskDistribution)}
            </div>
            
            {/* Integration Distribution Card */}
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Integration Breakdown</h3>
              {renderDistributionBars(integrationDistribution)}
            </div>
            
            {/* Status Distribution Card */}
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Status Breakdown</h3>
              {renderDistributionBars(statusDistribution)}
            </div>
          </div>
          
          {/* Additional Distribution Card */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-gray-900 pb-4 px-4 rounded-b-lg -mt-6 pt-2">
            {/* Time Distribution Card */}
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Time Distribution</h3>
              {renderDistributionBars(timeDistribution)}
            </div>
            
            {/* Empty spaces to maintain layout */}
            <div className="hidden md:block"></div>
            <div className="hidden md:block"></div>
            <div className="hidden md:block"></div>
            <div className="hidden md:block"></div>
          </div>

          {/* Main Dashboard Grid (Original) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Risk Trend */}
            <div className="bg-white rounded-md shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold uppercase text-gray-700">Risk Trend</h2>
                <button className="text-gray-500">
                  <FaEllipsisV />
                </button>
              </div>
              {riskTrendData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={riskTrendData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" name="Activities" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="risk" name="Risk Score" stroke="#ff9800" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500 mb-2">Not enough data available</p>
                  <p className="text-gray-400 text-sm">This is how it will look like</p>
                </div>
              )}
            </div>

            {/* Severity Trend */}
            <div className="bg-white rounded-md shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold uppercase text-gray-700">Severity Trend</h2>
                <button className="text-gray-500">
                  <FaEllipsisV />
                </button>
              </div>
              {severityTrendData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={severityTrendData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="critical" name="Critical" stroke={COLORS.risk.critical} strokeWidth={2} />
                      <Line type="monotone" dataKey="high" name="High" stroke={COLORS.risk.high} strokeWidth={2} />
                      <Line type="monotone" dataKey="medium" name="Medium" stroke={COLORS.risk.medium} strokeWidth={2} />
                      <Line type="monotone" dataKey="low" name="Low" stroke={COLORS.risk.low} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500 mb-2">Not enough data available</p>
                  <p className="text-gray-400 text-sm">This is how it will look like</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Policy Breaches */}
            <div className="bg-white rounded-md shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold uppercase text-gray-700">Policy Breaches</h2>
                <button className="text-gray-500">
                  <FaEllipsisV />
                </button>
              </div>
              {policyBreachData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={policyBreachData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="count" name="Breach Count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500 mb-2">Not enough data available</p>
                  <p className="text-gray-400 text-sm">This is how it will look like</p>
                </div>
              )}
            </div>

            {/* Integration Breakdown */}
            <div className="bg-white rounded-md shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold uppercase text-gray-700">Integration Breakdown</h2>
                <button className="text-gray-500">
                  <FaEllipsisV />
                </button>
              </div>
              {integrationData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={integrationData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500 mb-2">Not enough data available</p>
                  <p className="text-gray-400 text-sm">This is how it will look like</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Users Needing Attention */}
            <div className="bg-white rounded-md shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold uppercase text-gray-700">Users Needing Attention</h2>
                <button className="text-gray-500">
                  <FaEllipsisV />
                </button>
              </div>
              {usersNeedingAttention.length > 0 ? (
                <div>
                  {usersNeedingAttention.map((user, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border-b">
                      <span className="text-sm">{user.username}</span>
                      <div className="flex gap-2">
                        <span className={`text-xs rounded px-2 py-1 ${user.criticalCount > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-200'}`}>
                          {user.criticalCount} C
                        </span>
                        <span className={`text-xs rounded px-2 py-1 ${user.highCount > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-200'}`}>
                          {user.highCount} H
                        </span>
                        <span className={`text-xs rounded px-2 py-1 ${user.mediumCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-200'}`}>
                          {user.mediumCount} M
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500 mb-2">Not enough data available</p>
                  <p className="text-gray-400 text-sm">This is how it will look like</p>
                </div>
              )}
            </div>

            {/* User Activity List */}
            <div className="bg-white rounded-md shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold uppercase text-gray-700">Recent Activities</h2>
              </div>
              {activities.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  <ActivityList 
                    activities={activities.slice(0, 5)} 
                    policyIcons={policyIcons}
                  />
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500 mb-2">Not enough data available</p>
                  <p className="text-gray-400 text-sm">This is how it will look like</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Calculate activity data over time - simplified version that relies on processed dates
function calculateActivityOverTime(activities: UserActivity[]) {
  if (!activities || activities.length === 0) {
    return [];
  }

  // Find date range in activities
  const dateMap = new Map<string, { count: number, totalRisk: number }>();
  
  activities.forEach(activity => {
    let dateStr = '';
    
    // Try to get date from activity
    if (activity.date) {
      dateStr = activity.date;
    } else if (activity.timestamp) {
      // Extract date from timestamp
      const date = new Date(activity.timestamp);
      dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    
    // Skip if no date available
    if (!dateStr) return;
    
    // Update or initialize the date entry
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { count: 0, totalRisk: 0 });
    }
    
    const entry = dateMap.get(dateStr)!;
    entry.count++;
    entry.totalRisk += activity.riskScore || 0;
  });
  
  // Convert to array and sort by date
  const result = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    risk: Math.round(data.totalRisk / data.count)
  }));
  
  // Sort by date
  return result.sort((a, b) => {
    // Try to compare dates
    try {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    } catch (e) {
      // Fallback to string comparison if date parsing fails
      return a.date.localeCompare(b.date);
    }
  });
}

// Calculate severity trend over time
function calculateSeverityTrend(activities: UserActivity[]) {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  // Group by date and count severity levels
  const dateMap = new Map<string, { critical: number, high: number, medium: number, low: number }>();
  
  activities.forEach(activity => {
    let dateStr = '';
    
    // Try to get date from activity
    if (activity.date) {
      dateStr = activity.date;
    } else if (activity.timestamp) {
      // Extract date from timestamp
      const date = new Date(activity.timestamp);
      dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    
    // Skip if no date available
    if (!dateStr) return;
    
    // Initialize entry if needed
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { critical: 0, high: 0, medium: 0, low: 0 });
    }
    
    // Get severity from risk score
    const entry = dateMap.get(dateStr)!;
    const riskScore = activity.riskScore || 0;
    
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
      entry.critical++;
    } else if (riskScore >= RISK_THRESHOLDS.HIGH) {
      entry.high++;
    } else if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
      entry.medium++;
    } else {
      entry.low++;
    }
  });
  
  // Convert to array and sort by date
  const result = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    ...data
  }));
  
  // Sort by date
  return result.sort((a, b) => {
    // Try to compare dates
    try {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    } catch (e) {
      // Fallback to string comparison if date parsing fails
      return a.date.localeCompare(b.date);
    }
  });
}

// Calculate policy breach categories
function calculatePolicyBreaches(activities: UserActivity[]) {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  // Count breaches by category
  const breachCounts: Record<string, number> = {};
  
  activities.forEach(activity => {
    if (!activity.policiesBreached) return;
    
    const policies = activity.policiesBreached;
    
    // Process each category
    Object.keys(policies).forEach(category => {
      if (!breachCounts[category]) {
        breachCounts[category] = 0;
      }
      
      const breaches = policies[category];
      if (Array.isArray(breaches)) {
        // If it's an array of breaches, count each one
        breachCounts[category] += breaches.length;
      } else if (typeof breaches === 'boolean' && breaches) {
        // If it's a boolean true value, count it once
        breachCounts[category] += 1;
      } else if (breaches) {
        // For any other truthy value
        breachCounts[category] += 1;
      }
    });
  });
  
  // Convert to array format for chart
  return Object.entries(breachCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 categories
}

// Calculate integration breakdown
function calculateIntegrationBreakdown(activities: UserActivity[]) {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  // Create map of integration types and counts
  const integrationCounts: Record<string, number> = {};
  
  activities.forEach(activity => {
    if (!activity.integration) return;
    
    const integration = activity.integration;
    if (!integrationCounts[integration]) {
      integrationCounts[integration] = 0;
    }
    integrationCounts[integration]++;
  });
  
  // Colors for different integration types
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
  
  // Convert to array format for pie chart
  return Object.entries(integrationCounts)
    .map(([name, value], index) => ({ 
      name, 
      value,
      color: colors[index % colors.length]
    }));
}

// Calculate users with high risk activities
function calculateUsersAtRisk(activities: UserActivity[]) {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  const userMap = new Map();
  
  // Debug log to check the activities
  console.log('Processing activities for users at risk:', activities.length);
  
  activities.forEach(activity => {
    // Try to get username from various properties and normalize to lowercase
    const username = (activity.username || activity.userId || activity.user || 'Unknown User').toLowerCase();
    
    if (!userMap.has(username)) {
      userMap.set(username, {
        username,
        highRisk: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0
      });
    }
    
    const user = userMap.get(username);
    const riskScore = activity.riskScore || 0;
    
    // Count high and critical risk activities for sorting
    if (riskScore >= RISK_THRESHOLDS.HIGH) {
      user.highRisk++;
    }
    
    // Count activities by severity category - use explicit range checks
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
      user.criticalCount++;
      // Log critical activities for debugging
      console.log(`Critical activity found for ${username}:`, riskScore);
    } else if (riskScore >= RISK_THRESHOLDS.HIGH && riskScore < RISK_THRESHOLDS.CRITICAL) {
      user.highCount++;
    } else if (riskScore >= RISK_THRESHOLDS.MEDIUM && riskScore < RISK_THRESHOLDS.HIGH) {
      user.mediumCount++;
    } else {
      user.lowCount++;
    }
  });
  
  // Get users with high risk activities, sorted by critical count first, then high risk count
  const result = Array.from(userMap.values())
    .filter(user => user.highRisk > 0 || user.criticalCount > 0) // Include users with any high or critical activities
    .sort((a, b) => {
      // Sort by critical count first
      if (b.criticalCount !== a.criticalCount) {
        return b.criticalCount - a.criticalCount;
      }
      // If critical count is the same, sort by high count
      return b.highCount - a.highCount;
    })
    .slice(0, 5); // Top 5 users
  
  // Debug log the result
  console.log('Users at risk result:', result);
  
  return result;
}
