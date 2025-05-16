'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper, 
  Container,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { UserActivity } from '../../types/activity';
import { ActivityList } from '../../components/ActivityList';
import { policyIcons } from '../../constants/policyIcons';
import { generateStatistics, RISK_THRESHOLDS } from '../../utils/dataProcessor';

/**
 * Tab Panel component for Dashboard tabs
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Dashboard page with multiple views (Overview, Advanced Analytics, User Activity)
 */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  
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
          setError(null);
        } else {
          setActivities([]);
          setError('No activity data found');
        }
      } catch (err) {
        console.error('Error loading activities:', err);
        setError('Failed to load activities data. Please try uploading data from the Upload page.');
        
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
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : activities.length === 0 ? (
          <Alert severity="info">
            No activity data available. Please navigate to the Upload page to provide data for analysis.
          </Alert>
        ) : (
          <>
            {/* Summary Cards */}
            <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#1e1a3c',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{totalActivities}</Typography>
                <Typography variant="subtitle1">Total Activities</Typography>
              </Paper>
              
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#7e3af2',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{highRiskActivities}</Typography>
                <Typography variant="subtitle1">High Risk Activities</Typography>
              </Paper>
              
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#ff5a8f',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{policyBreaches}</Typography>
                <Typography variant="subtitle1">Recent Policy Breaches</Typography>
              </Paper>
              
              <Paper
                sx={{
                  p: 3,
                  bgcolor: '#2d7bf4',
                  color: 'white',
                  flex: 1,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h3">{usersAtRisk}</Typography>
                <Typography variant="subtitle1">Users at Risk</Typography>
              </Paper>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="Dashboard tabs">
                <Tab label="Overview" />
                <Tab label="Advanced Analytics" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <TabPanel value={activeTab} index={0}>
              {/* Distribution Cards Section */}
              <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Risk Distribution</Typography>
                  {renderDistributionBars(riskDistribution)}
                </Paper>
                
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Integration Distribution</Typography>
                  {renderDistributionBars(integrationDistribution)}
                </Paper>
                
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Status Distribution</Typography>
                  {renderDistributionBars(statusDistribution)}
                </Paper>
                
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Time Distribution</Typography>
                  {renderDistributionBars(timeDistribution)}
                </Paper>
              </Box>

              {/* Risk Trend and Severity Trend */}
              <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 2 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Risk Trend</Typography>
                  <Box sx={{ height: 300 }}>
                    {riskTrendData.length > 0 ? (
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
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Typography variant="body2" color="textSecondary">Not enough data available</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Severity Trend</Typography>
                  <Box sx={{ height: 300 }}>
                    {severityTrendData.length > 0 ? (
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
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Typography variant="body2" color="textSecondary">Not enough data available</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Policy Breaches and Integration Breakdown */}
              <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 2 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Policy Breaches</Typography>
                  <Box sx={{ height: 300 }}>
                    {policyBreachData.length > 0 ? (
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
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Typography variant="body2" color="textSecondary">Not enough data available</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Integration Breakdown</Typography>
                  <Box sx={{ height: 300 }}>
                    {integrationData.length > 0 ? (
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
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Typography variant="body2" color="textSecondary">Not enough data available</Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Users Needing Attention */}
              <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Users Needing Attention</Typography>
                {usersNeedingAttention.length > 0 ? (
                  <Box>
                    {usersNeedingAttention.map((user, index) => (
                      <Box key={index} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        py: 1, 
                        borderBottom: '1px solid rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="body2">{user.username}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Box sx={{ 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1, 
                            fontSize: '0.75rem', 
                            bgcolor: user.criticalCount > 0 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(0,0,0,0.1)',
                            color: user.criticalCount > 0 ? '#f44336' : 'text.disabled'
                          }}>
                            {user.criticalCount} C
                          </Box>
                          <Box sx={{ 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1, 
                            fontSize: '0.75rem', 
                            bgcolor: user.highCount > 0 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0,0,0,0.1)',
                            color: user.highCount > 0 ? '#ff9800' : 'text.disabled'
                          }}>
                            {user.highCount} H
                          </Box>
                          <Box sx={{ 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1, 
                            fontSize: '0.75rem', 
                            bgcolor: user.mediumCount > 0 ? 'rgba(33, 150, 243, 0.1)' : 'rgba(0,0,0,0.1)',
                            color: user.mediumCount > 0 ? '#2196f3' : 'text.disabled'
                          }}>
                            {user.mediumCount} M
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={150}>
                    <Typography variant="body2" color="textSecondary">No users at risk found</Typography>
                  </Box>
                )}
              </Paper>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Typography variant="h6" gutterBottom>
                Advanced Analytics
              </Typography>
              {/* You can add your AdvancedCharts component here if needed */}
              <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Risk Distribution</Typography>
                <Box sx={{ height: 300 }}>
                  {riskDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                      <Typography variant="body2" color="textSecondary">Not enough data available</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </TabPanel>
          </>
        )}
      </Box>
    </Container>
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
    } else if (riskScore >= RISK_THRESHOLDS.HIGH && riskScore < RISK_THRESHOLDS.CRITICAL) {
      entry.high++;
    } else if (riskScore >= RISK_THRESHOLDS.MEDIUM && riskScore < RISK_THRESHOLDS.HIGH) {
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