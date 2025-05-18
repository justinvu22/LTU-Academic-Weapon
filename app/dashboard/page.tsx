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
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
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
    },
    policy: {
      // This is a placeholder for the new policy color logic
    }
  };

  // Add at the top of the component, after COLORS:
  const POLICY_COLORS: { [key: string]: string } = {
    'Unusual Activity': '#FF4C4C',
    'Monitoring': '#FFB84C',
    'Data Security': '#4CBFFF',
    'Critical Violations': '#4CFF8B',
    'Access Violation': '#FF4C8B',
  };

  const DISTRIBUTION_TABS = [
    { label: 'Status', key: 'status', data: statusDistribution },
    { label: 'Time', key: 'time', data: timeDistribution },
    { label: 'Risk', key: 'risk', data: riskDistribution },
    { label: 'Integration', key: 'integration', data: integrationDistribution },
  ];
  const [selectedDistributionTab, setSelectedDistributionTab] = useState('status');

  // Add hoveredBar state for hover animation
  const [hoveredBar, setHoveredBar] = React.useState<number | null>(null);
  const maxBarHeight = 120;
  const minBarHeight = 32;
  const barBaseHeight = (count: number) => Math.max(minBarHeight, Math.min(maxBarHeight, (count / Math.max(...statusDistribution.map(e => e.count))) * maxBarHeight));
  const barHoverHeight = (count: number) => barBaseHeight(count) + 28;

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
                    fontWeight: 600,
                    fontSize: '1.25rem', // 20px, bigger
                    color: '#EEE',
                    letterSpacing: '0.02em',
                    textShadow: '0 1px 8px #0008',
                  }}
                  id={`bar-label-${type}-${index}`}
                >
                  {item.name}
                </span>
                <span
                  className="font-extrabold"
                  style={{
                    fontFamily: 'IBM Plex Sans, Inter, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.5rem', // 24px, bigger
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
                  height: isHovered ? 18 : 16, // bigger bar height
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
        </Box>
      </Box>
    );
  }

  const totalStatus = statusDistribution.reduce((a, b) => a + b.count, 0);
  const [drawnPercents, setDrawnPercents] = React.useState([0, 0, 0, 0]);
  const [hoveredRing, setHoveredRing] = React.useState<number | null>(null);
  React.useEffect(() => {
    statusDistribution.forEach((entry, idx) => {
      const percent = totalStatus > 0 ? Math.round((entry.count / totalStatus) * 100) : 0;
      setTimeout(() => {
        setDrawnPercents(prev => {
          const next = [...prev];
          next[idx] = percent;
          return next;
        });
      }, 100 + idx * 120);
    });
  }, [statusDistribution, totalStatus]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12">
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
              {/* --- SECTION 1: Top Row --- */}
              <div className="w-full mb-10" style={{ display: 'grid', gridTemplateColumns: '30% 70%', gridTemplateRows: 'minmax(400px, auto)', gap: '2rem', alignItems: 'stretch' }}>
                {/* Unified Policy Breach Card */}
                <div style={{ height: '100%' }}>
                  <div
                    className="backdrop-blur-md bg-[#232346cc] border border-[#6E5FFE33] shadow-[0_4px_32px_#8B5CF655] rounded-3xl flex flex-row items-center h-full px-10 py-8 gap-8"
                    style={{ minHeight: 340, boxSizing: 'border-box', position: 'relative' }}
                  >
                    {/* Donut Chart - larger, right side compact, divider restored */}
                    <div className="flex flex-col items-center justify-center" style={{ minWidth: 300, maxWidth: 340, flex: '0 0 300px' }}>
                      {policyBreachData.length > 0 ? (
                        <div className="relative flex items-center justify-center w-full" style={{ width: 300, height: 300, maxWidth: '100%' }}>
                          <ResponsiveContainer width={300} height={300}>
                            <PieChart>
                              <Pie
                                data={policyBreachData}
                                cx="50%"
                                cy="50%"
                                innerRadius={105}
                                outerRadius={140}
                                paddingAngle={2}
                                dataKey="count"
                                startAngle={90}
                                endAngle={-270}
                                stroke="none"
                              >
                                {policyBreachData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={POLICY_COLORS[entry.category] || Object.values(COLORS.risk)[idx % 4]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Center content */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full" style={{ pointerEvents: 'none' }}>
                            {(() => {
                              const total = policyBreachData.reduce((a, b) => a + b.count, 0);
                              const numDigits = String(total).length;
                              let fontSize = 48;
                              if (numDigits >= 7) fontSize = 32;
                              else if (numDigits >= 5) fontSize = 38;
                              else if (numDigits >= 3) fontSize = 44;
                              return (
                                <>
                                  <span
                                    className="font-extrabold text-white drop-shadow-lg"
                                    style={{
                                      fontFamily: 'Inter',
                                      lineHeight: 1.1,
                                      fontSize,
                                      maxWidth: 140,
                                      textAlign: 'center',
                                      wordBreak: 'break-word',
                                      letterSpacing: '-0.04em',
                                    }}
                                  >
                                    {total}
                                  </span>
                                  <span
                                    className="font-semibold text-[#A084E8] mt-1 tracking-widest uppercase"
                                    style={{
                                      fontFamily: 'Inter',
                                      letterSpacing: '0.08em',
                                      fontSize: 14,
                                      textAlign: 'center',
                                      display: 'block',
                                    }}
                                  >
                                    Total Breaches
                                  </span>
                                </>
                              );
                            })()}
                </div>
                </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[300px]">
                          <span className="text-gray-400">No policy breach data available</span>
                </div>
                      )}
                </div>
                    {/* Divider */}
                    <div style={{ width: 2, height: 220, background: 'linear-gradient(180deg, #6E5FFE33 0%, #23234600 100%)', borderRadius: 2, margin: '0 2.5rem' }} />
                    {/* Legend - no header */}
                    <div className="flex flex-col justify-center gap-4 w-full" style={{ minWidth: 0 }}>
                      {policyBreachData.length > 0 ? (
                        <div className="flex flex-col gap-4 w-full items-start justify-center">
                          {policyBreachData.map((entry, idx) => (
                            <div key={entry.category} className="flex flex-row items-center gap-3">
                              <span className="font-extrabold text-white text-lg" style={{ fontFamily: 'Inter', minWidth: 38, textAlign: 'right', letterSpacing: '0.01em' }}>{entry.count}</span>
                              <span className="rounded-full px-2 py-0.5 text-xs font-bold shadow-md" style={{ background: POLICY_COLORS[entry.category] || Object.values(COLORS.risk)[idx % 4], color: '#fff', fontFamily: 'Inter', letterSpacing: '0.04em', fontSize: 12, minWidth: 0, borderRadius: 14, marginLeft: 4 }}>{entry.category}</span>
              </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[300px]">
                          <span className="text-gray-400">No policy breach data available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Right column: Risk Trend */}
                <div style={{ height: '100%' }}>
                  <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-8 h-full flex flex-col justify-center items-center" style={{ height: '100%', boxSizing: 'border-box' }}>
                    <h2 className="text-xl font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-4">Risk Trend</h2>
                    <Box sx={{ flex: '1 1 auto', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, minWidth: 0 }}>
                    {riskTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={320}>
                          <AreaChart
                          data={riskTrendData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FFB84C" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#FFB84C" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="6 6" stroke="#2d2e44" />
                            <XAxis dataKey="date" tick={{ fill: '#bdbdfc', fontFamily: 'Inter', fontSize: 13 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#bdbdfc', fontFamily: 'Inter', fontSize: 13 }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: 'rgba(30, 32, 48, 0.95)', border: 'none', borderRadius: 12, boxShadow: '0 4px 24px #7B8BFF55', color: '#fff', fontFamily: 'Inter' }}
                              labelStyle={{ color: '#7B8BFF', fontWeight: 700, fontFamily: 'Inter' }}
                              itemStyle={{ fontFamily: 'Inter', fontWeight: 600 }}
                              cursor={{ stroke: '#7B8BFF', strokeWidth: 2, opacity: 0.2 }}
                            />
                            <Area
                              type="monotone"
                              dataKey="risk"
                              stroke="#8B5CF6"
                              strokeWidth={4}
                              fill="url(#colorRisk)"
                              dot={{
                                r: 3,
                                fill: '#8B5CF6',
                                stroke: 'none',
                                filter: 'none'
                              }}
                              activeDot={{
                                r: 4,
                                fill: '#8B5CF6',
                                stroke: 'none',
                                filter: 'none'
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke="#FFB84C"
                              strokeWidth={4}
                              fill="url(#colorActivities)"
                              dot={{
                                r: 3,
                                fill: '#FFB84C',
                                stroke: 'none',
                                filter: 'none'
                              }}
                              activeDot={{
                                r: 4,
                                fill: '#FFB84C',
                                stroke: 'none',
                                filter: 'none'
                              }}
                            />
                            <Legend
                              iconType="circle"
                              wrapperStyle={{ paddingTop: 16, fontFamily: 'Inter', fontWeight: 700, fontSize: 15 }}
                              formatter={(value) => {
                                if (value === 'risk') return <span style={{ color: '#8B5CF6' }}>Risk Score</span>;
                                if (value === 'count') return <span style={{ color: '#FFB84C' }}>Activities</span>;
                                return value;
                              }}
                            />
                          </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <span className="text-gray-400">Not enough data available</span>
                      </div>
                    )}
                  </Box>
                </div>
                </div>
              </div>

              {/* --- SECTION 2: Middle Cards --- */}
              <div className="w-full mb-10" style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: '2rem' }}>
                {/* Left: Severity Trend, Status Distribution, Activity Status Distribution */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Severity Trend */}
                  <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-14 flex flex-col" style={{ height: 540, minHeight: 540, marginBottom: 0 }}>
                    <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Severity Trend</h2>
                    <Box sx={{ height: 440 }}>
                      {severityTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={severityTrendData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FF4C4C" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#FF4C4C" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FFB84C" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#FFB84C" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4CBFFF" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#4CBFFF" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4CFF8B" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#4CFF8B" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="6 6" stroke="#2d2e44" />
                            <XAxis dataKey="date" tick={{ fill: '#bdbdfc', fontFamily: 'Inter', fontSize: 13 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#bdbdfc', fontFamily: 'Inter', fontSize: 13 }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: 'rgba(30, 32, 48, 0.95)', border: 'none', borderRadius: 12, boxShadow: '0 4px 24px #7B8BFF55', color: '#fff', fontFamily: 'Inter' }}
                              labelStyle={{ color: '#7B8BFF', fontWeight: 700, fontFamily: 'Inter' }}
                              itemStyle={{ fontFamily: 'Inter', fontWeight: 600 }}
                              cursor={{ stroke: '#7B8BFF', strokeWidth: 2, opacity: 0.2 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="critical"
                              stroke="#FF4C4C"
                              strokeWidth={4}
                              fill="url(#criticalGradient)"
                              dot={{ r: 3, fill: '#FF4C4C', stroke: 'none', filter: 'none' }}
                              activeDot={{ r: 4, fill: '#FF4C4C', stroke: 'none', filter: 'none' }}
                              name="Critical"
                              isAnimationActive={true}
                              opacity={0.95}
                              style={{ filter: 'drop-shadow(0 0 8px #FF4C4C88)' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="high"
                              stroke="#FFB84C"
                              strokeWidth={4}
                              fill="url(#highGradient)"
                              dot={{ r: 3, fill: '#FFB84C', stroke: 'none', filter: 'none' }}
                              activeDot={{ r: 4, fill: '#FFB84C', stroke: 'none', filter: 'none' }}
                              name="High"
                              isAnimationActive={true}
                              opacity={0.95}
                              style={{ filter: 'drop-shadow(0 0 8px #FFB84C88)' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="medium"
                              stroke="#4CBFFF"
                              strokeWidth={4}
                              fill="url(#mediumGradient)"
                              dot={{ r: 3, fill: '#4CBFFF', stroke: 'none', filter: 'none' }}
                              activeDot={{ r: 4, fill: '#4CBFFF', stroke: 'none', filter: 'none' }}
                              name="Medium"
                              isAnimationActive={true}
                              opacity={0.95}
                              style={{ filter: 'drop-shadow(0 0 8px #4CBFFF88)' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="low"
                              stroke="#4CFF8B"
                              strokeWidth={4}
                              fill="url(#lowGradient)"
                              dot={{ r: 3, fill: '#4CFF8B', stroke: 'none', filter: 'none' }}
                              activeDot={{ r: 4, fill: '#4CFF8B', stroke: 'none', filter: 'none' }}
                              name="Low"
                              isAnimationActive={true}
                              opacity={0.95}
                              style={{ filter: 'drop-shadow(0 0 8px #4CFF8B88)' }}
                            />
                            <Legend
                              iconType="circle"
                              wrapperStyle={{ paddingTop: 16, fontFamily: 'Inter', fontWeight: 700, fontSize: 15 }}
                              formatter={(value) => {
                                if (value === 'critical') return <span style={{ color: '#FF4C4C' }}>Critical</span>;
                                if (value === 'high') return <span style={{ color: '#FFB84C' }}>High</span>;
                                if (value === 'medium') return <span style={{ color: '#4CBFFF' }}>Medium</span>;
                                if (value === 'low') return <span style={{ color: '#4CFF8B' }}>Low</span>;
                                return value;
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[440px]">
                          <span className="text-gray-400">Not enough data available</span>
                        </div>
                      )}
                    </Box>
                  </div>
                  {/* Risk Distribution */}
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem' }}>
                    {/* Risk Distribution */}
                    <div className="rounded-[12px] shadow-[0_4px_32px_#9c7bed22] bg-[#1f1f2e] p-8 flex flex-col gap-10 w-full" style={{ minWidth: 0, minHeight: 440 }}>
                      <div className="flex flex-row gap-4 mb-6 px-1 py-2 rounded-lg border border-[#444] bg-transparent w-fit mt-2" style={{ boxShadow: '0 1px 8px #6E5FFE11' }}>
                        {DISTRIBUTION_TABS.map(tab => (
                          <button
                            key={tab.key}
                            className={`relative px-7 py-2 rounded-md font-extrabold text-base tracking-widest uppercase transition-all duration-200
                              ${selectedDistributionTab === tab.key
                                ? 'text-[#A084E8] border-none outline-none'
                                : 'text-[#bdbdfc] border-none outline-none hover:text-[#A084E8]'}
                            `}
                            style={{
                              fontFamily: 'Inter',
                              letterSpacing: '0.08em',
                              background: 'transparent',
                              boxShadow: 'none',
                              border: 'none',
                              position: 'relative',
                            }}
                            onClick={() => setSelectedDistributionTab(tab.key)}
                          >
                            {tab.label}
                            {selectedDistributionTab === tab.key && (
                              <span
                                className="absolute left-1/2 -translate-x-1/2 bottom-0 h-1 rounded-full"
                                style={{
                                  width: '70%',
                                  background: 'linear-gradient(90deg, #A084E8 0%, #6E5FFE 100%)',
                                  boxShadow: '0 2px 8px #A084E855',
                                  transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                                }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                      {/* Show the selected distribution's bars */}
                      <DistributionBars data={DISTRIBUTION_TABS.find(tab => tab.key === selectedDistributionTab)?.data || riskDistribution} type={selectedDistributionTab} />
                </div>
                    {/* Activity Status Distribution - Premium Redesign */}
                    <div className="rounded-[18px] shadow-[0_4px_32px_#9c7bed22] bg-[#1f1f2e] border border-[#2d2e44] p-10 flex flex-col w-full h-full" style={{ minWidth: 0, minHeight: 440, boxSizing: 'border-box' }}>
                      <div className="flex flex-row items-end justify-evenly w-full h-full gap-10 md:gap-10 sm:gap-6 mt-6" style={{ minHeight: 260, gap: '2.5rem' }}>
                        {statusDistribution.map((entry, idx) => {
                          const color = entry.color;
                          const isHovered = hoveredBar === idx;
                          return (
                            <div key={entry.name} className="flex flex-col items-center justify-end" style={{ minWidth: 90 }}>
                              {/* Count */}
                              <span className="font-extrabold text-white mb-3" style={{ fontSize: 32, textShadow: '0 2px 12px #0008', letterSpacing: '0.01em', fontFamily: 'Inter' }}>{entry.count}</span>
                              {/* Bar with hover animation */}
                              <div className="w-12 mb-3 flex items-end justify-center" style={{ height: 140 }}>
                                <div
                                  className="w-12 cursor-pointer"
                                  style={{
                                    height: isHovered ? barHoverHeight(entry.count) : barBaseHeight(entry.count),
                                    background: `linear-gradient(180deg, ${color} 80%, ${color}33 100%)`,
                                    borderRadius: 24,
                                    boxShadow: isHovered
                                      ? `0 8px 32px 0 ${color}88, 0 2px 0 0 #fff2 inset`
                                      : `0 4px 24px 0 ${color}44, 0 1.5px 0 0 #fff2 inset`,
                                    transition: 'height 0.35s cubic-bezier(.4,0,.2,1), box-shadow 0.35s cubic-bezier(.4,0,.2,1)',
                                    opacity: 1,
                                  }}
                                  onMouseEnter={() => setHoveredBar(idx)}
                                  onMouseLeave={() => setHoveredBar(null)}
                                ></div>
                              </div>
                              {/* Label */}
                              <span className="mt-1 font-semibold" style={{ color, fontFamily: 'Inter', fontSize: 16, letterSpacing: '0.04em', textShadow: '0 1px 6px #0006' }}>{entry.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right: Status Percentages (with Integration Breakdown) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, maxWidth: '100%' }}>
                  <div className="rounded-[12px] shadow-[0_4px_32px_#9c7bed22] bg-[#1f1f2e] p-8 flex flex-col gap-10 w-full h-full" style={{ minHeight: 440 }}>
                    <h2 className="font-['Inter'] text-[18px] font-semibold tracking-wider text-[#9c7bed] mb-2">Status Percentages</h2>
                    <div className="grid grid-cols-2 gap-10 w-full">
                      {statusDistribution.map((entry, idx) => {
                        const percent = totalStatus > 0 ? Math.round((entry.count / totalStatus) * 100) : 0;
                        const draw = drawnPercents[idx] || 0;
                        const isHovered = hoveredRing === idx;
                        return (
                          <div
                            key={entry.name}
                            className="flex flex-col items-center justify-center transition-transform duration-200"
                            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
                            onMouseEnter={() => setHoveredRing(idx)}
                            onMouseLeave={() => setHoveredRing(null)}
                          >
                            <div className="relative flex items-center justify-center">
                              <svg width="128" height="128" viewBox="0 0 128 128">
                                <circle cx="64" cy="64" r="54" stroke="#2d2e44" strokeWidth="14" fill="none" />
                                <circle cx="64" cy="64" r="54" stroke={entry.color} strokeWidth="14" fill="none" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - draw / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }} />
                              </svg>
                              <span className="absolute text-[28px] font-extrabold text-white" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Inter', letterSpacing: '0.01em', width: '60px', textAlign: 'center' }}>{percent}%</span>
                              {isHovered && (
                                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-[#232346] text-white text-xs rounded px-3 py-1 shadow-lg border border-[#9c7bed] z-10 transition-all duration-200">
                                  {entry.count} activities
                      </div>
                    )}
                </div>
                            <span className="mt-2 text-[15px] font-medium text-[#e0e6f0]" style={{ fontFamily: 'Inter', letterSpacing: '0.02em' }}>{entry.name}</span>
              </div>
                        );
                      })}
                        </div>
                    {/* Integration Breakdown Section */}
                    <div className="mt-8">
                      <h3 className="text-[15px] font-semibold text-[#A084E8] mb-4 uppercase tracking-wide">Integration Breakdown</h3>
                      <div className="grid grid-cols-2 gap-10 w-full">
                        {integrationDistribution.map((integration, idx) => {
                          const total = integrationDistribution.reduce((sum, i) => sum + i.count, 0);
                          const percent = total > 0 ? Math.round((integration.count / total) * 100) : 0;
                          const color = integration.color;
                          return (
                            <div key={integration.name} className="flex flex-col items-center justify-center">
                              <div className="relative flex items-center justify-center mb-2">
                                <svg width="128" height="128" viewBox="0 0 128 128">
                                  <circle cx="64" cy="64" r="54" stroke="#2d2e44" strokeWidth="14" fill="none" />
                                  <circle cx="64" cy="64" r="54" stroke={color} strokeWidth="14" fill="none" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - percent / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 12px ${color}66)` }} />
                                </svg>
                                <span className="absolute text-[28px] font-extrabold text-white" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Inter', letterSpacing: '0.01em', width: '60px', textAlign: 'center' }}>{percent}%</span>
                      </div>
                              <span className="mt-2 text-[15px] font-medium text-[#e0e6f0] capitalize" style={{ fontFamily: 'Inter', letterSpacing: '0.02em' }}>{integration.name}</span>
                              <span className="block text-xs text-[#9c7bed] mt-1">{integration.count} activities</span>
                  </div>
                          );
                        })}
              </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- SECTION 3: Bottom Row --- */}
              <div className="w-full" style={{ marginBottom: '2rem' }}>
                <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-extrabold text-[#8B5CF6] uppercase tracking-wide mb-2">Activity Timeline</h2>
                <Box sx={{ height: 300 }}>
                    {riskTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={calculateActivityOverTime(activities)}
                          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7B8BFF" stopOpacity={0.85} />
                              <stop offset="100%" stopColor="#7B8BFF" stopOpacity={0.18} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="6 6" stroke="#2d2e44" />
                          <XAxis dataKey="date" tick={{ fill: '#bdbdfc', fontFamily: 'Inter', fontSize: 13 }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" tick={{ fill: '#bdbdfc', fontFamily: 'Inter', fontSize: 13 }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#bdbdfc', fontFamily: 'Inter', fontSize: 13 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: 'rgba(30, 32, 48, 0.95)', border: 'none', borderRadius: 12, boxShadow: '0 4px 24px #7B8BFF55', color: '#fff', fontFamily: 'Inter' }}
                            labelStyle={{ color: '#7B8BFF', fontWeight: 700, fontFamily: 'Inter' }}
                            itemStyle={{ fontFamily: 'Inter', fontWeight: 600 }}
                            cursor={{ stroke: '#7B8BFF', strokeWidth: 2, opacity: 0.2 }}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="count"
                            name="Activities"
                            fill="url(#barGradient)"
                            radius={[8, 8, 4, 4]}
                            barSize={18}
                            stroke="#A6B6FF"
                            strokeWidth={1.5}
                            style={{ filter: 'drop-shadow(0 2px 12px #7B8BFF44)' }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="risk"
                            name="Anomaly Score"
                            stroke="#FFB84C"
                            strokeWidth={4}
                            dot={{
                              r: 7,
                              fill: '#FFB84C',
                              stroke: '#fff',
                              strokeWidth: 3,
                              filter: 'drop-shadow(0 2px 8px #FFB84CAA)'
                            }}
                            activeDot={{
                              r: 10,
                              fill: '#fff',
                              stroke: '#FFB84C',
                              strokeWidth: 5,
                              filter: 'drop-shadow(0 2px 12px #FFB84CCC)'
                            }}
                          />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{ paddingTop: 16, fontFamily: 'Inter', fontWeight: 700, fontSize: 15 }}
                            formatter={(value) => {
                              if (value === 'count') return <span style={{ color: '#7B8BFF' }}>Activities</span>;
                              if (value === 'risk') return <span style={{ color: '#FFB84C' }}>Anomaly Score</span>;
                              return value;
                            }}
                          />
                        </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px]">
                      <span className="text-gray-400">Not enough data available</span>
                    </div>
                  )}
                </Box>
              </div>
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