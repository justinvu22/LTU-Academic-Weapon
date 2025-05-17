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
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { UserActivity, MLRecommendation, TimeDistribution } from '@/types';
import { generateStatistics, RISK_THRESHOLDS } from '../../utils/dataProcessor';
import { HeatmapCell } from '../../utils/ml/heatmapAnalysis';
import { SequencePattern, SequenceStep } from '../../utils/ml/sequencePatterns';
import { useMLProcessing } from '../../hooks/useMLProcessing';

/**
 * Check if code is running in browser
 */
const isBrowser = () => typeof window !== 'undefined';

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

// Add this as a utility function at the top where other utility functions are defined
// Safe check for empty arrays or objects
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// Add this helper function to properly format date and time
function formatDateTime(activity: UserActivity): string {
  // Check if we have both date and time
  if (activity.date && activity.time) {
    return `${activity.date} ${activity.time}`;
  }
  
  // If we only have date
  if (activity.date) {
    return activity.date;
  }
  
  // If we have a timestamp, extract date and time
  if (activity.timestamp) {
    try {
      const date = new Date(activity.timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  return '';
}

/**
 * Dashboard page with multiple views (Overview, Advanced Analytics)
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

  const fetchActivities = async () => {
    try {
      console.log('Fetching activities data...');
      setLoading(true);
      let foundData = false;
      
      // Try IndexedDB first
      try {
        const { getActivitiesFromIndexedDB } = await import('../../utils/storage');
        const indexedDBActivities = await getActivitiesFromIndexedDB();
        
        if (indexedDBActivities && indexedDBActivities.length > 0) {
          console.log(`Successfully loaded ${indexedDBActivities.length} activities from IndexedDB`);
          
          // Additional log to debug data format issues
          const firstFewActivities = indexedDBActivities.slice(0, 3);
          console.log('Sample activities for debugging:', 
            firstFewActivities.map(a => ({
              id: a.id,
              user: a.user,
              username: a.username,
              date: a.date,
              time: a.time,
              dateTime: formatDateTime(a),
              riskScore: a.riskScore,
              integration: a.integration
            }))
          );
          
          setActivities(indexedDBActivities);
          processAllData(indexedDBActivities);
          foundData = true;
        } else {
          console.log('No data found in IndexedDB');
        }
      } catch (idbError) {
        console.error('Error accessing IndexedDB:', idbError);
        setError('Error accessing data storage. Please try uploading data again.');
        setLoading(false);
        return;
      }
      
      // If no data found, show error
      if (!foundData) {
        setError('No activity data found. Please upload data from the Upload page first.');
      }
    } catch (error) {
      console.error('Error loading activity data:', error);
      setError('Failed to load activity data. Please try uploading data from the Upload page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only run in browser environment
    if (!isBrowser()) return;
    
    fetchActivities();
  }, []);

  // Process all data metrics and statistics
  const processAllData = (activities: UserActivity[]) => {
    if (!activities || activities.length === 0) {
      resetAllData();
      return;
    }
    
    console.log('Processing all data for dashboard with', activities.length, 'activities');
    
    // Log a sample of activities for debugging
    console.log('Sample activities for analysis:', 
      activities.slice(0, 3).map(a => ({
        user: a.user,
        username: a.username,
        date: a.date,
        time: a.time,
        hour: a.hour,
        integration: a.integration,
        riskScore: a.riskScore
      }))
    );
    
    // Use our data processor to calculate statistics
    const statistics = generateStatistics(activities);
    
    console.log('Generated statistics:', {
      totalActivities: statistics.totalActivities,
      highRiskActivities: statistics.highRiskActivities,
      timeDistribution: statistics.timeDistribution
    });
    
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
    
    // Update time distribution from the statistics
    setTimeDistribution([
      { name: 'Morning', count: statistics.timeDistribution.morning, color: COLORS.time.morning },
      { name: 'Afternoon', count: statistics.timeDistribution.afternoon, color: COLORS.time.afternoon },
      { name: 'Evening', count: statistics.timeDistribution.evening, color: COLORS.time.evening }
    ]);
    
    console.log('Time distribution set:', [
      { name: 'Morning', count: statistics.timeDistribution.morning },
      { name: 'Afternoon', count: statistics.timeDistribution.afternoon },
      { name: 'Evening', count: statistics.timeDistribution.evening }
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

  // Advanced Analytics Tab
  function AdvancedAnalyticsTab() {
    // Client-side only state to track if component is mounted
    const [isMounted, setIsMounted] = useState(false);
    const [hasClientLoaded, setHasClientLoaded] = useState(false);
    
    // Only run ML on client side after mount and only if we have enough data
    const shouldProcessML = isMounted && activities.length >= 10;
    
    // Use the ML processing hook for worker-based processing
    const { 
      results, 
      progress, 
      isProcessing, 
      error 
    } = useMLProcessing(shouldProcessML ? activities : []);
    
    // Only run on client side after mount
    useEffect(() => {
      setIsMounted(true);
      
      // Short delay before showing content to ensure client-side code is ready
      const timer = setTimeout(() => {
        setHasClientLoaded(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }, [activities]);
    
    // Destructure results for easier access
    const { 
      anomalyTimelineData, 
      heatmapData, 
      sequentialPatternData, 
      userClusteringData
    } = results;
    
    // Flag to check if processing is complete
    const processingComplete = !isProcessing && 
      anomalyTimelineData?.length > 0 && 
      heatmapData?.length > 0;
    
    // Color constants for visuals
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
    const RISK_COLORS = {
      low: '#00C49F',
      medium: '#FFBB28',
      high: '#FF8042', 
      critical: '#FF0000',
      normal: '#0088FE',
      anomaly: '#FF0000'
    };
    
    // Custom label renderer for pie charts
    const renderCustomizedLabel = (props: any) => {
      const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
      const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
      
      return (
        <text 
          x={x} 
          y={y} 
          fill="white" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
        >
          {`${name}: ${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };
    
    // Server-side or initial render placeholder
    if (!hasClientLoaded) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading advanced analytics...
          </Typography>
        </Box>
      );
    }
    
    // Check if we have enough data
    const hasEnoughActivities = activities.length >= 10;
    
    // Show no data message if insufficient data
    if (!hasEnoughActivities) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            Not enough activity data for ML analysis. Please collect more data.
          </Typography>
        </Paper>
      );
    }
    
    // Show loading state with progress when processing
    if (isProcessing && (!processingComplete || 
        isEmpty(anomalyTimelineData) || 
        isEmpty(heatmapData) || 
        isEmpty(sequentialPatternData) || 
        isEmpty(userClusteringData))) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress variant="determinate" value={progress.overall * 100} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Processing data with machine learning ({Math.round(progress.overall * 100)}%)
          </Typography>
          
          {/* Show partial results message if any results are available */}
          {(anomalyTimelineData?.length > 0 || heatmapData?.length > 0) && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Partial results are being displayed below as they become available.
            </Typography>
          )}
        </Box>
      );
    }
    
    // Show error message if processing failed
    if (error && !processingComplete) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </Box>
        </Alert>
      );
    }
    
    // Render the ML analytics dashboard
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Advanced ML Analytics</Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Anomaly Detection Timeline */}
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">Anomaly Detection Timeline</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ML-detected anomalies in user activity over time
            </Typography>
            
            <ResponsiveContainer width="100%" height={220}>
              {!isEmpty(anomalyTimelineData) ? (
                <LineChart 
                  data={anomalyTimelineData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="activities"
                    stroke={RISK_COLORS.normal}
                    name="Activities"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="anomalyScore" 
                    stroke={RISK_COLORS.high}
                    strokeDasharray="5 5"
                    name="Anomaly Score"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="anomalies" 
                    stroke={RISK_COLORS.anomaly}
                    strokeWidth={0}
                    name="Detected Anomalies"
                    dot={{ r: 6, fill: RISK_COLORS.anomaly }}
                  />
                </LineChart>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No anomaly data available
                  </Typography>
                </Box>
              )}
            </ResponsiveContainer>
          </Paper>
          
          {/* Risk Pattern Heatmap */}
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">Risk Pattern Heatmap</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              ML-identified risk hotspots by time and integration
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              height: 220,
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              {/* Custom heatmap rendering since recharts doesn't have built-in heatmaps */}
              {['email', 'cloud', 'usb', 'application', 'file', 'other'].map((integration) => (
                <Box 
                  key={integration} 
                  sx={{ 
                    display: 'flex', 
                    height: '16.66%', 
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      width: 80, 
                      textAlign: 'right', 
                      pr: 1,
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {integration}
                  </Typography>
                  <Box sx={{ display: 'flex', flexGrow: 1, height: '100%' }}>
                    {heatmapData
                      .filter(cell => cell.integration === integration)
                      .map((cell: HeatmapCell) => (
                        <Box
                          key={`${cell.integration}-${cell.hour}`}
                          sx={{
                            width: `${100/24}%`,
                            height: '100%',
                            bgcolor: cell.intensity > 0 
                              ? `rgba(255, ${Math.max(0, 150 - Math.floor(cell.intensity * 150))}, 0, ${Math.min(0.9, cell.intensity)})`
                              : 'rgba(240, 240, 240, 0.5)',
                            border: '1px solid white',
                            position: 'relative',
                            '&:hover': {
                              opacity: 0.8,
                            }
                          }}
                          title={`${cell.integration} at ${cell.hour}:00 - Risk Score: ${cell.score.toFixed(0)}`}
                        />
                      ))}
                  </Box>
                </Box>
              ))}
              {/* Hour labels */}
              <Box sx={{ display: 'flex', width: '100%', pl: 80 }}>
                {[0, 6, 12, 18, 23].map(hour => (
                  <Typography 
                    key={hour} 
                    variant="caption"
                    sx={{ 
                      position: 'absolute',
                      left: `calc(80px + ${hour * 4.1}%)`,
                      bottom: 0
                    }}
                  >
                    {hour}:00
                  </Typography>
                ))}
              </Box>
            </Box>
          </Paper>
          
          {/* Sequential Pattern Graph - Improved Version */}
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">Sequential Pattern Analysis</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ML-detected activity sequences and risk patterns
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 220, overflowY: 'auto' }}>
              {!isEmpty(sequentialPatternData) ? (
                sequentialPatternData.map((pattern: SequencePattern, patternIndex: number) => (
                  <Box 
                    key={patternIndex}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      p: 1.5,
                      border: pattern.isHighRisk ? '1px solid #ff3d00' : '1px solid #e0e0e0',
                      borderRadius: 1,
                      backgroundColor: pattern.isHighRisk ? 'rgba(255, 61, 0, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                      boxShadow: pattern.isHighRisk ? '0 2px 6px rgba(255, 0, 0, 0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                      {pattern.steps.map((step: SequenceStep, stepIndex: number) => (
                        <React.Fragment key={stepIndex}>
                          <Box 
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center'
                            }}
                          >
                            <Box
                              sx={{
                                minWidth: 120,
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid rgba(0,0,0,0.1)',
                                backgroundColor: step.riskLevel === 'critical' ? '#FF0000' :
                                                  step.riskLevel === 'high' ? '#FF8042' :
                                                  step.riskLevel === 'medium' ? '#FFBB28' : '#00C49F',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 'inherit' }}>
                                {step.action}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                                ({step.integration})
                              </Typography>
                            </Box>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                mt: 0.5, 
                                color: step.riskLevel === 'critical' || step.riskLevel === 'high' ? 'error.main' : 'text.secondary',
                                fontWeight: step.riskLevel === 'critical' || step.riskLevel === 'high' ? 'bold' : 'normal'
                              }}
                            >
                              {step.riskLevel} risk
                            </Typography>
                          </Box>
                          
                          {stepIndex < pattern.steps.length - 1 && (
                            <Box sx={{ 
                              px: 1, 
                              fontSize: '1.5rem', 
                              color: pattern.isHighRisk ? 'error.main' : 'text.secondary',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              →
                            </Box>
                          )}
                        </React.Fragment>
                      ))}
                    </Box>
                    
                    <Box sx={{ ml: 2, minWidth: 120 }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 'medium',
                        color: pattern.isHighRisk ? 'error.main' : 'text.primary'
                      }}>
                        {pattern.count} occurrences
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        display: 'block',
                        color: pattern.isHighRisk ? 'error.main' : 'text.secondary',
                        fontWeight: pattern.isHighRisk ? 'bold' : 'normal'
                      }}>
                        Risk score: {Math.round(pattern.averageRiskScore)}
                      </Typography>
                      {pattern.isHighRisk && (
                        <Typography variant="caption" sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: 'error.main',
                          fontWeight: 'bold',
                          mt: 0.5
                        }}>
                          <Box component="span" sx={{ 
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'error.main'
                          }}/>
                          ML-Flagged Risk
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    No pattern data available
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
          
          {/* User Behavior Clustering */}
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">User Behavior Clustering</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ML-detected user behavior groupings and outliers
            </Typography>
            
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Risk Profile" 
                  label={{ 
                    value: 'Risk Profile', 
                    position: 'bottom', 
                    offset: 0 
                  }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Behavior Diversity"
                  label={{ 
                    value: 'Behavior Diversity', 
                    angle: -90, 
                    position: 'left' 
                  }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid #ccc' }}>
                          <Typography variant="body2">{data.name}</Typography>
                          <Typography variant="caption" display="block">
                            Cluster: {data.cluster}
                          </Typography>
                          <Typography variant="caption" display="block" 
                            color={data.isOutlier ? RISK_COLORS.critical : 'text.secondary'}>
                            {data.isOutlier ? 'ML-Flagged Outlier' : 'Normal Behavior Pattern'}
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  name="Users" 
                  data={userClusteringData}
                  fill={RISK_COLORS.normal}
                >
                  {userClusteringData.map((entry: any, index: number) => (
                    <Cell 
                      key={index} 
                      fill={entry.isOutlier ? RISK_COLORS.critical : RISK_COLORS.normal}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Paper>
          
          {/* Risk Distribution (original chart) */}
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6">Risk Distribution</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Distribution of activities by risk level
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={renderCustomizedLabel}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>
    );
  }

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
              <AdvancedAnalyticsTab />
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
  console.log('Calculating policy breaches for', activities.length, 'activities');
  
  if (!activities || activities.length === 0) {
    console.log('No activities provided for policy breach calculation');
    return [];
  }
  
  // Count breaches by category
  const breachCounts: Record<string, number> = {};
  let totalBreachesFound = 0;
  
  activities.forEach((activity, index) => {
    if (!activity.policiesBreached) return;
    
    // Log first few activities for debugging
    if (index < 3) {
      console.log(`Activity ${index} policiesBreached:`, 
        activity.policiesBreached,
        'Keys:', Object.keys(activity.policiesBreached).length
      );
    }
    
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
        totalBreachesFound += breaches.length;
      } else if (typeof breaches === 'boolean' && breaches) {
        // If it's a boolean true value, count it once
        breachCounts[category] += 1;
        totalBreachesFound += 1;
      } else if (breaches) {
        // For any other truthy value
        breachCounts[category] += 1;
        totalBreachesFound += 1;
      }
    });
  });
  
  console.log('Total policy breaches found:', totalBreachesFound, 
    'Categories:', Object.keys(breachCounts).length
  );
  
  // Convert to array format for chart
  const result = Object.entries(breachCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 categories
    
  console.log('Policy breach data for chart:', result);
  return result;
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
  
  // Log a sample of users from the data (first 5 activities)
  const userSample = activities.slice(0, 5).map(a => ({
    user: a.user,
    username: a.username,
    userId: a.userId
  }));
  console.log('User field sample:', userSample);
  
  activities.forEach(activity => {
    // Try to get username from various properties with more flexible handling
    let username = 'Unknown User';
    
    // Check all possible user field variations with fallback chain
    if (activity.user && typeof activity.user === 'string' && activity.user.trim()) {
      username = activity.user.trim();
    } else if (activity.username && typeof activity.username === 'string' && activity.username.trim()) {
      username = activity.username.trim();
    } else if (activity.userId && typeof activity.userId === 'string' && activity.userId.trim()) {
      username = activity.userId.trim();
    }
    
    // Normalize to lowercase for consistency
    username = String(username).toLowerCase();
    
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
  
  // Log users found with counts
  console.log(`Found ${userMap.size} unique users in the data`);
  
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