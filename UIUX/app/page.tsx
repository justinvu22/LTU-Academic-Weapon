// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { FaHome, FaFilter, FaEllipsisV, FaSun, FaCloud, FaUsb, FaRegWindowRestore, FaExclamationTriangle, FaBell } from 'react-icons/fa';
import { Box, CircularProgress, Typography, Card, CardContent, Grid, Chip, Tooltip as MuiTooltip, Paper } from '@mui/material';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ActivityList } from '../components/ActivityList';
import { policyIcons } from '../constants/policyIcons';
import { UserActivity } from '../types/activity';

// Interface for ML recommendations
interface MLRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedUsers: string[];
  suggestedActions: string[];
  timestamp: string;
}

// Simple recommendation engine implemented directly in the component
const generateRecommendations = (activities: UserActivity[]): MLRecommendation[] => {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  const recommendations: MLRecommendation[] = [];
  const usersMap = new Map<string, UserActivity[]>();
  
  // Group activities by user
  activities.forEach(activity => {
    const user = activity.username || activity.userId || activity.user || '';
    if (!user) return;
    
    const userActivities = usersMap.get(user) || [];
    userActivities.push(activity);
    usersMap.set(user, userActivities);
  });
  
  // Analyze each user's activities
  usersMap.forEach((userActivities, user) => {
    // Look for high risk score activities
    const highRiskActivities = userActivities.filter(a => (a.riskScore || 0) > 1500);
    if (highRiskActivities.length >= 2) {
      recommendations.push({
        id: `${user}_high_risk_${Date.now()}`,
        title: 'Security Alert: High Risk Activities Detected',
        description: `User ${user} has performed multiple high-risk activities`,
        severity: 'high',
        confidence: 0.85,
        affectedUsers: [user],
        suggestedActions: [
          'Review user access permissions',
          'Implement additional monitoring',
          'Schedule security training',
        ],
        timestamp: new Date().toISOString()
      });
    }
    
    // Look for unusual time patterns
    const nightActivities = userActivities.filter(activity => {
      let hour = -1;
      
      if (activity.timestamp) {
        const date = new Date(activity.timestamp);
        hour = date.getHours();
      } else if (activity.time) {
        const timeParts = activity.time.split(':');
        if (timeParts.length >= 1) {
          hour = parseInt(timeParts[0]);
        }
      }
      
      return hour >= 0 && (hour < 6 || hour > 22);
    });
    
    if (nightActivities.length >= 2) {
      recommendations.push({
        id: `${user}_unusual_time_${Date.now()}`,
        title: 'Security Alert: Activities During Unusual Hours',
        description: `User ${user} has been active during non-business hours`,
        severity: 'medium',
        confidence: 0.75,
        affectedUsers: [user],
        suggestedActions: [
          'Review access patterns',
          'Implement time-based restrictions',
          'Monitor for similar patterns',
        ],
        timestamp: new Date().toISOString()
      });
    }
    
    // Look for policy breaches
    const sensitiveBreaches = userActivities.filter(activity => {
      if (!activity.policiesBreached) return false;
      
      const policies = activity.policiesBreached;
      return (
        (policies.pii && typeof policies.pii !== 'undefined') ||
        (policies.phi && typeof policies.phi !== 'undefined') ||
        (policies.sensitive && typeof policies.sensitive !== 'undefined')
      );
    });
    
    if (sensitiveBreaches.length >= 1) {
      recommendations.push({
        id: `${user}_sensitive_data_${Date.now()}`,
        title: 'Security Alert: Handling of Sensitive Data Detected',
        description: `User ${user} has accessed or transferred sensitive data`,
        severity: 'high',
        confidence: 0.92,
        affectedUsers: [user],
        suggestedActions: [
          'Review data access policies',
          'Implement data loss prevention',
          'Conduct compliance audit',
        ],
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Sort by confidence score (highest first)
  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

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
          setActivities(data.activities);
          processAllData(data.activities);
          
          // Generate ML recommendations
          try {
            const generatedRecommendations = generateRecommendations(data.activities);
            setRecommendations(generatedRecommendations);
          } catch (mlError) {
            console.error('Error generating ML recommendations:', mlError);
          }
          
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
              setActivities(parsedData);
              processAllData(parsedData);
              
              // Generate ML recommendations
              try {
                const generatedRecommendations = generateRecommendations(parsedData);
                setRecommendations(generatedRecommendations);
              } catch (mlError) {
                console.error('Error generating ML recommendations:', mlError);
              }
              
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
    
    // Basic stats
    const total = activities.length;
    setTotalActivities(total);
    
    // High risk activities (risk score >= 70)
    const highRisk = activities.filter(a => (a.riskScore || 0) >= 70).length;
    setHighRiskActivities(highRisk);
    
    // Count unique users with any risk
    const uniqueUsers = new Set(activities.map(a => a.username || a.userId || 'unknown'));
    setUsersAtRisk(uniqueUsers.size);
    
    // Count policy breaches
    let breachCount = 0;
    activities.forEach(activity => {
      if (activity.policiesBreached) {
        Object.keys(activity.policiesBreached).forEach(category => {
          const breaches = activity.policiesBreached[category];
          if (Array.isArray(breaches)) {
            breachCount += breaches.length;
          } else if (breaches) {
            breachCount += 1;
          }
        });
      }
    });
    setPolicyBreaches(breachCount);
    
    // Calculate average risk score
    const totalRisk = activities.reduce((sum, activity) => sum + (activity.riskScore || 0), 0);
    setAverageRiskScore(Math.round(totalRisk / total));
    
    // Risk distribution - using proper thresholds based on csvProcessor
    const riskCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    activities.forEach(activity => {
      const score = activity.riskScore || 0;
      if (score < 1000) riskCounts.low++;
      else if (score < 1500) riskCounts.medium++;
      else if (score < 2000) riskCounts.high++;
      else riskCounts.critical++;
    });
    
    setRiskDistribution([
      { name: 'Low', count: riskCounts.low, color: COLORS.risk.low },
      { name: 'Medium', count: riskCounts.medium, color: COLORS.risk.medium },
      { name: 'High', count: riskCounts.high, color: COLORS.risk.high },
      { name: 'Critical', count: riskCounts.critical, color: COLORS.risk.critical }
    ]);
    
    // Integration distribution - handle 'si-' prefix for integrations
    const integrationCounts: Record<string, number> = {
      email: 0,
      cloud: 0,
      usb: 0,
      application: 0
    };
    
    activities.forEach(activity => {
      if (!activity.integration) return;
      
      // Remove 'si-' prefix if present
      let integration = activity.integration.toLowerCase();
      if (integration.startsWith('si-')) {
        integration = integration.substring(3);
      }
      
      // Map to one of our valid categories
      if (integration === 'email' || integration === 'cloud' || 
          integration === 'usb' || integration === 'application') {
        integrationCounts[integration]++;
      }
    });
    
    setIntegrationDistribution(
      Object.entries(integrationCounts).map(([name, count]) => {
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
    
    // Similar to normalizeStatus function in csvProcessor.ts
    const normalizeStatus = (status: string): string => {
      if (!status) return 'underReview';
      
      const normalized = status.trim().toLowerCase();
      
      // Check for common variations and normalize
      if (/under.*review/i.test(normalized)) return 'underReview';
      if (/trust/i.test(normalized)) return 'trusted';
      if (/concern/i.test(normalized) && /non/i.test(normalized)) return 'nonConcern';
      if (/concern/i.test(normalized)) return 'concern';
      
      // If no match, check if it's already one of our allowed values
      const allowedStatuses = ['underReview', 'trusted', 'concern', 'nonConcern'];
      if (allowedStatuses.includes(normalized)) return normalized;
      
      // Default fallback
      return 'underReview';
    };
    
    activities.forEach(activity => {
      const status = normalizeStatus(activity.status || '');
      statusCounts[status as keyof typeof statusCounts]++;
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
    const timeCounts = {
      morning: 0,
      afternoon: 0,
      evening: 0
    };
    
    activities.forEach(activity => {
      let hour = -1;
      
      // Try to get hour from timestamp
      if (activity.timestamp) {
        const date = new Date(activity.timestamp);
        hour = date.getHours();
      } 
      // Try to get hour from time field (format: "HH:MM")
      else if (activity.time) {
        const timeParts = activity.time.split(':');
        if (timeParts.length >= 1) {
          hour = parseInt(timeParts[0], 10);
        }
      }
      
      // Skip if we couldn't parse the hour
      if (hour < 0) return;
      
      // Use same hour ranges as in csvProcessor.ts
      if (hour < 12) timeCounts.morning++;
      else if (hour < 17) timeCounts.afternoon++;
      else timeCounts.evening++;
    });
    
    setTimeDistribution([
      { name: 'Morning', count: timeCounts.morning, color: COLORS.time.morning },
      { name: 'Afternoon', count: timeCounts.afternoon, color: COLORS.time.afternoon },
      { name: 'Evening', count: timeCounts.evening, color: COLORS.time.evening }
    ]);
    
    // Process data for existing charts
    setRiskTrendData(calculateActivityOverTime(activities, 7));
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

  // Get severity color for recommendations
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format confidence percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
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

          {/* ML Recommendations Section */}
          {recommendations.length > 0 && (
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex items-center mb-3">
                  <FaExclamationTriangle className="text-yellow-500 mr-2" />
                  <h2 className="text-lg font-semibold">Machine Learning Insights</h2>
                </div>
                <div className="space-y-4">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className={`border p-4 rounded-md ${getSeverityColor(rec.severity)}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{rec.title}</h3>
                          <p className="text-sm mt-1">{rec.description}</p>
                          
                          <div className="mt-3">
                            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Recommended Actions:</h4>
                            <ul className="list-disc pl-5 text-sm">
                              {rec.suggestedActions.map((action, i) => (
                                <li key={i}>{action}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="mt-3 text-xs text-gray-500">
                            Affected Users: {rec.affectedUsers.join(', ')}
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end">
                          <MuiTooltip title="Confidence Score">
                            <Chip 
                              label={formatConfidence(rec.confidence)} 
                              size="small"
                              className="mb-2"
                              color={rec.confidence > 0.8 ? "error" : rec.confidence > 0.6 ? "warning" : "info"}
                            />
                          </MuiTooltip>
                          <div className="text-xs text-gray-500">
                            {new Date(rec.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {recommendations.length > 3 && (
                    <div className="text-center pt-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View {recommendations.length - 3} more insights →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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

// Calculate activity data over time
function calculateActivityOverTime(activities: UserActivity[], days: number) {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  // Get dates for the specified days
  const today = new Date();
  const dates: { date: string, dateObj: Date }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push({ 
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), 
      dateObj: date 
    });
  }
  
  // Initialize counts for each date
  const timeData = dates.map(d => ({ 
    date: d.date, 
    count: 0,
    risk: 0 
  }));
  
  // Count activities for each date
  activities.forEach(activity => {
    // Try to get date from timestamp or date property
    let activityDate: Date | null = null;
    
    if (activity.timestamp) {
      activityDate = new Date(activity.timestamp);
    } else if (activity.date) {
      // Handle dates in format DD/MM/YYYY
      const parts = activity.date.split('/');
      if (parts.length === 3) {
        // Convert to YYYY-MM-DD format for Date constructor
        activityDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    
    // Skip if we couldn't parse the date
    if (!activityDate) return;
    
    // Check if activity date is within the range
    dates.forEach((d, i) => {
      if (
        activityDate!.getDate() === d.dateObj.getDate() &&
        activityDate!.getMonth() === d.dateObj.getMonth() &&
        activityDate!.getFullYear() === d.dateObj.getFullYear()
      ) {
        timeData[i].count++;
        timeData[i].risk += activity.riskScore || 0;
      }
    });
  });
  
  // Calculate average risk for each day
  timeData.forEach(day => {
    if (day.count > 0) {
      day.risk = Math.round(day.risk / day.count);
    }
  });
  
  return timeData;
}

// Calculate severity trend over time
function calculateSeverityTrend(activities: UserActivity[]) {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  // Get dates for the last 7 days
  const today = new Date();
  const dates: { date: string, dateObj: Date }[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push({ 
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), 
      dateObj: date 
    });
  }
  
  // Initialize severity counts for each date
  const severityData = dates.map(d => ({ 
    date: d.date, 
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }));
  
  // Count activities by severity for each date
  activities.forEach(activity => {
    // Try to get date from timestamp or date property
    let activityDate: Date | null = null;
    
    if (activity.timestamp) {
      activityDate = new Date(activity.timestamp);
    } else if (activity.date) {
      // Handle dates in format DD/MM/YYYY
      const parts = activity.date.split('/');
      if (parts.length === 3) {
        // Convert to YYYY-MM-DD format for Date constructor
        activityDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    
    // Skip if we couldn't parse the date
    if (!activityDate) return;
    
    // Check if activity date is within the last 7 days and categorize by severity
    dates.forEach((d, i) => {
      if (
        activityDate!.getDate() === d.dateObj.getDate() &&
        activityDate!.getMonth() === d.dateObj.getMonth() &&
        activityDate!.getFullYear() === d.dateObj.getFullYear()
      ) {
        const riskScore = activity.riskScore || 0;
        
        if (riskScore >= 90) {
          severityData[i].critical++;
        } else if (riskScore >= 70) {
          severityData[i].high++;
        } else if (riskScore >= 40) {
          severityData[i].medium++;
        } else {
          severityData[i].low++;
        }
      }
    });
  });
  
  return severityData;
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
  
  activities.forEach(activity => {
    const username = activity.username || activity.userId || 'Unknown User';
    
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
    
    if (riskScore >= 70) {
      user.highRisk++;
    }
    
    if (riskScore >= 90) {
      user.criticalCount++;
    } else if (riskScore >= 70) {
      user.highCount++;
    } else if (riskScore >= 40) {
      user.mediumCount++;
    } else {
      user.lowCount++;
    }
  });
  
  // Get users with high risk activities, sorted by count
  return Array.from(userMap.values())
    .filter(user => user.highRisk > 0)
    .sort((a, b) => b.highRisk - a.highRisk)
    .slice(0, 5); // Top 5 users
}
