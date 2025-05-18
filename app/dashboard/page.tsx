'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { MdOutlineListAlt, MdOutlineGavel, MdOutlinePersonOff } from 'react-icons/md';
import { FaSkull } from 'react-icons/fa';

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

  // Ripple effect helper
  function useRipple() {
    const [ripple, setRipple] = React.useState<{x: number, y: number} | null>(null);
    const timeout = React.useRef<NodeJS.Timeout | null>(null);

    const triggerRipple = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setRipple(null), 150);
    };

    const Ripple = ripple ? (
      <span
        className="absolute rounded-full pointer-events-none"
        style={{
          left: ripple.x - 20,
          top: ripple.y - 20,
          width: 40,
          height: 40,
          background: 'rgba(255,255,255,0.15)',
          animation: 'ripple-anim 150ms linear',
          zIndex: 1,
        }}
      />
    ) : null;

    return { Ripple, triggerRipple };
  }

  // Tooltip component
  function BarTooltip({ count }: { count: number }) {
    return (
      <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-20 flex flex-col items-center">
        <div className="bg-[#333] text-white text-xs px-2 py-1 rounded shadow-lg font-medium relative">
          {count}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-3 h-3 bg-[#333] rotate-45" style={{ marginTop: '-6px' }} />
        </div>
      </div>
    );
  }

  // Filter callback stub
  function handleDistributionBarClick(type: string, name: string) {
    // TODO: Implement filter logic
    // e.g., setFilter({ type, value: name })
    // For now, just log
    console.log(`Filter: ${type} = ${name}`);
  }

  const DistributionBars = ({
    data,
    type = ''
  }: {
    data: { name: string; count: number; color: string }[];
    type?: string;
  }) => {
    const [hovered, setHovered] = React.useState<number | null>(null);
    const [animatedWidths, setAnimatedWidths] = React.useState<number[]>(data.map(() => 0));
    const prevData = React.useRef(data);

    React.useEffect(() => {
      // Animate widths on data change
      const total = data.reduce((sum, item) => sum + item.count, 0);
      setAnimatedWidths(
        data.map((item) => (total > 0 ? (item.count / total) * 100 : 0))
      );
      prevData.current = data;
    }, [data]);

    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((item, index) => {
          const { Ripple, triggerRipple } = useRipple();
          const isHovered = hovered === index;
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span
                  className="font-medium"
                  style={{
                    fontFamily: 'IBM Plex Sans, Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '1rem',
                    color: '#EEE',
                    letterSpacing: '0.02em',
                    textShadow: '0 1px 8px #0008',
                  }}
                  id={`bar-label-${type}-${index}`}
                >
                  {item.name}
                </span>
                <span
                  className="font-semibold"
                  style={{
                    fontFamily: 'IBM Plex Sans, Inter, sans-serif',
                    fontWeight: 600,
                    fontSize: '1.125rem', // 18px
                    color: '#EEE',
                    textShadow: '0 1px 8px #0008',
                    letterSpacing: '0.02em',
                    lineHeight: 1.1,
                    verticalAlign: 'middle',
                  }}
                >
                  {item.count}
                </span>
              </div>
              <div
                className="relative w-full cursor-pointer select-none"
                style={{
                  height: isHovered ? 12 : 10,
                  transition: 'height 120ms cubic-bezier(.4,0,.2,1), transform 120ms cubic-bezier(.4,0,.2,1)',
                  transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => {
                  triggerRipple(e);
                  handleDistributionBarClick(type, item.name);
                }}
                tabIndex={0}
                role="progressbar"
                aria-valuenow={item.count}
                aria-valuemax={data.reduce((sum, d) => sum + d.count, 0)}
                aria-label={`${item.name} ${type} count`}
                aria-labelledby={`bar-label-${type}-${index}`}
              >
                {/* Track */}
                <div
                  className="absolute top-0 left-0 w-full h-full rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    boxShadow: 'inset 0 1px 4px 0 rgba(110,95,254,0.10)',
                    borderRadius: 5,
                  }}
                />
                {/* Fill */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-200 ease-out overflow-hidden"
                  style={{
                    width: `${animatedWidths[index]}%`,
                    background: `linear-gradient(90deg, ${item.color} 80%, #fff2 100%)`,
                    boxShadow: `0 0 8px 0 ${item.color}55`,
                    borderRadius: 5,
                    zIndex: 2,
                    transition: 'width 200ms cubic-bezier(.4,0,.2,1)',
                    position: 'relative',
                  }}
                >
                  {/* Shine effect on hover */}
                  {isHovered && (
                    <span
                      className="absolute top-0 left-0 h-full"
                      style={{
                        width: '100%',
                        pointerEvents: 'none',
                        background: 'linear-gradient(120deg, transparent 60%, rgba(255,255,255,0.25) 80%, transparent 100%)',
                        animation: 'shine-move 900ms linear',
                        zIndex: 3,
                      }}
                    />
                  )}
                </div>
                {/* Ripple */}
                {Ripple}
                {/* Tooltip */}
                {isHovered && <BarTooltip count={item.count} />}
              </div>
            </div>
          );
        })}
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
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <div className="flex items-center mb-8">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Dashboard</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] w-full">
            <CircularProgress sx={{ color: '#8B5CF6' }} />
          </div>
        ) : error ? (
          <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
            <h2 className="text-lg font-extrabold text-red-400 uppercase mb-2">Error</h2>
            <p className="text-red-300">{error}</p>
            <p className="text-gray-400 mt-2">Please upload activity data to get dashboard insights.</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
            <h2 className="text-lg font-extrabold text-purple-300 uppercase mb-2">No Data</h2>
            <p className="text-gray-400">No activity data available. Please navigate to the Upload page to provide data for analysis.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              {/* Total Activities */}
              <Box className="flex items-center bg-white rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_rgba(255,255,255,0.35)] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg mr-6">
                  <MdOutlineListAlt className="text-4xl text-black drop-shadow" />
                </div>
                <div>
                  <div className="text-6xl font-extrabold text-[#232346] drop-shadow-lg leading-tight">{totalActivities}</div>
                  <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-[#444] opacity-90" style={{ letterSpacing: '0.12em' }}>Total Activities</div>
                </div>
              </Box>
              {/* High Risk Activities */}
              <Box className="flex items-center bg-gradient-to-br from-[#FF3B3B] to-[#EC4899] rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_#FF3B3B44] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FF7B7B] to-[#FF3B3B] shadow-lg mr-6">
                  <FaSkull className="text-4xl text-white drop-shadow" />
                </div>
                <div>
                  <div className="text-6xl font-extrabold text-white drop-shadow-lg leading-tight">{highRiskActivities}</div>
                  <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-white opacity-90" style={{ letterSpacing: '0.12em' }}>High Risk Activities</div>
                </div>
              </Box>
              {/* Policy Breaches */}
              <Box className="flex items-center bg-gradient-to-br from-[#7928CA] to-[#8B5CF6] rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_#7928CA44] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#A084E8] to-[#8B5CF6] shadow-lg mr-6">
                  <MdOutlineGavel className="text-4xl text-white drop-shadow" />
                </div>
                <div>
                  <div className="text-6xl font-extrabold text-white drop-shadow-lg leading-tight">{policyBreaches}</div>
                  <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-white opacity-90" style={{ letterSpacing: '0.12em' }}>Recent Policy Breaches</div>
                </div>
              </Box>
              {/* Users at Risk */}
              <Box className="flex items-center bg-gradient-to-br from-[#34D399] to-[#10B981] rounded-2xl shadow-2xl p-8 hover:shadow-[0_4px_32px_#10B98144] hover:scale-[1.03] transition-all duration-300 min-h-[8.5rem]">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#6EE7B7] to-[#34D399] shadow-lg mr-6">
                  <MdOutlinePersonOff className="text-4xl text-white drop-shadow" />
                </div>
                <div>
                  <div className="text-6xl font-extrabold text-white drop-shadow-lg leading-tight">{usersAtRisk}</div>
                  <div className="text-sm font-semibold uppercase tracking-widest mt-2 text-white opacity-90" style={{ letterSpacing: '0.12em' }}>Users at Risk</div>
                </div>
              </Box>
            </div>

            {/* Tabs */}
            <div className="relative z-10 mb-8">
              <div className="backdrop-blur-md bg-[#1F2030]/70 border border-white/10 rounded-xl shadow-lg px-4 py-2 flex items-center w-fit mx-auto">
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  aria-label="Dashboard tabs"
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
                  <Tab label="Overview" />
                  <Tab label="Advanced Analytics" />
                </Tabs>
              </div>
            </div>

            {/* Tab Panels */}
            <TabPanel value={activeTab} index={0}>
              {/* Distribution Cards Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#1F2030]/70 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Risk Distribution</h2>
                  <DistributionBars data={riskDistribution} type="risk" />
                </div>
                <div className="bg-[#1F2030]/70 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Integration Distribution</h2>
                  <DistributionBars data={integrationDistribution} type="integration" />
                </div>
                <div className="bg-[#1F2030]/70 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Status Distribution</h2>
                  <DistributionBars data={statusDistribution} type="status" />
                </div>
                <div className="bg-[#1F2030]/70 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Time Distribution</h2>
                  <DistributionBars data={timeDistribution} type="time" />
                </div>
              </div>

              {/* Risk Trend and Severity Trend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Risk Trend</h2>
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
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <span className="text-gray-400">Not enough data available</span>
                      </div>
                    )}
                  </Box>
                </div>
                <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Severity Trend</h2>
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
                          <Line type="monotone" dataKey="critical" name="Critical" stroke="#f44336" strokeWidth={2} />
                          <Line type="monotone" dataKey="high" name="High" stroke="#ff9800" strokeWidth={2} />
                          <Line type="monotone" dataKey="medium" name="Medium" stroke="#2196f3" strokeWidth={2} />
                          <Line type="monotone" dataKey="low" name="Low" stroke="#4caf50" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <span className="text-gray-400">Not enough data available</span>
                      </div>
                    )}
                  </Box>
                </div>
              </div>

              {/* Policy Breaches and Integration Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Policy Breaches</h2>
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
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <span className="text-gray-400">Not enough data available</span>
                      </div>
                    )}
                  </Box>
                </div>
                <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Integration Breakdown</h2>
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
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <span className="text-gray-400">Not enough data available</span>
                      </div>
                    )}
                  </Box>
                </div>
              </div>

              {/* Users Needing Attention */}
              <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Users Needing Attention</h2>
                {usersNeedingAttention.length > 0 ? (
                  <Box>
                    {usersNeedingAttention.map((user, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-[#333]">
                        <span className="text-[#EEE] font-medium">{user.username}</span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded bg-[#232346] text-xs font-bold ${user.criticalCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>{user.criticalCount} C</span>
                          <span className={`px-2 py-1 rounded bg-[#232346] text-xs font-bold ${user.highCount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>{user.highCount} H</span>
                          <span className={`px-2 py-1 rounded bg-[#232346] text-xs font-bold ${user.mediumCount > 0 ? 'text-blue-400' : 'text-gray-400'}`}>{user.mediumCount} M</span>
                        </div>
                      </div>
                    ))}
                  </Box>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[150px]">
                    <span className="text-gray-400">No users at risk found</span>
                  </div>
                )}
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <AdvancedAnalyticsTab />
            </TabPanel>
          </>
        )}
      </div>
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