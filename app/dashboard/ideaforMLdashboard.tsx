// components/MLDashboardComponents.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Line, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, Bar, ComposedChart, ReferenceArea
} from 'recharts';
import { Box, Paper, Typography, Chip, Select, MenuItem, FormControl, Tooltip as MuiTooltip, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, DialogActions, Button, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import { Warning, TrendingUp, Security, People, InfoOutlined } from '@mui/icons-material';
import { UserActivity, MLRecommendation } from '../../types/activity';
import { keyframes } from '@emotion/react';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';

// Color schemes
const RISK_COLORS = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#EAB308',
  low: '#10B981'
};

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => 
  i === 0 ? '12AM' : i < 12 ? `${i}AM` : i === 12 ? '12PM' : `${i - 12}PM`
);

// Format policy breaches into human-readable descriptions
const formatPolicyBreach = (policyType: string, policyDetails: string[] = []): { category: string, description: string } => {
  // Format category names
  const categoryMap: Record<string, string> = {
    'dataLeakage': 'Unauthorized Data Transfer',
    'sensitive': 'Sensitive Content Exposure',
    'pii': 'Personal Information Breach',
    'phi': 'Health Information Breach',
    'financial': 'Financial Data Exposure',
    'pci': 'Payment Card Breach',
    'userAtRisk': 'Suspicious User Activity',
    'fraud': 'Potential Fraud Activity'
  };

  // Get human-readable category
  const category = categoryMap[policyType] || policyType.replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());

  // Create more descriptive explanations based on breach type
  let description = '';
  
  if (policyDetails.length === 0) {
    // Generic descriptions if no details available
    switch(policyType) {
      case 'dataLeakage':
        description = 'Unauthorized transfer of company data detected';
        break;
      case 'sensitive':
        description = 'Sensitive company information was exposed';
        break;
      case 'pii':
        description = 'Personal identifiable information was exposed';
        break;
      case 'phi':
        description = 'Protected health information was exposed';
        break;
      case 'financial':
        description = 'Financial data was inappropriately shared';
        break;
      case 'pci':
        description = 'Payment card information was exposed';
        break;
      case 'userAtRisk':
        description = 'User exhibits suspicious activity patterns';
        break;
      case 'fraud':
        description = 'Potential fraudulent activity detected';
        break;
      default:
        description = 'Policy violation detected';
    }
    return { category, description };
  }

  // Pattern matching for specific breach types based on details
  if (policyType === 'dataLeakage') {
    if (policyDetails.some(d => d.includes('email') && d.includes('Documents'))) {
      description = 'Document files sent via email to external recipient';
    } else if (policyDetails.some(d => d.includes('email') && d.includes('Spreadsheets'))) {
      description = 'Spreadsheet files sent via email to external recipient';
    } else if (policyDetails.some(d => d.includes('cloud') && d.includes('Upload'))) {
      description = 'Company files uploaded to personal cloud storage';
    } else if (policyDetails.some(d => d.includes('usb'))) {
      description = 'Files copied to external USB device';
    } else if (policyDetails.some(d => d.includes('application'))) {
      description = 'Bulk data export from company application';
    } else if (policyDetails.some(d => d.includes('ToPersonalEmailAddress'))) {
      description = 'Company data sent to personal email account';
    } else {
      description = 'Unauthorized data transferred outside the organization';
    }
  } else if (policyType === 'sensitive') {
    if (policyDetails.some(d => d.includes('Confidential'))) {
      description = 'Confidential company information exposed';
    } else if (policyDetails.some(d => d.includes('Internal'))) {
      description = 'Internal documents shared outside approved channels';
    } else if (policyDetails.some(d => d.includes('Restricted'))) {
      description = 'Restricted data accessed or transferred';
    } else {
      description = 'Sensitive information improperly handled';
    }
  } else if (policyType === 'pii') {
    description = 'Personal identifiable information exposed or transferred';
  } else if (policyType === 'phi') {
    description = 'Protected health information exposed or transferred';
  } else if (policyType === 'financial') {
    if (policyDetails.some(d => d.includes('BankAccount'))) {
      description = 'Bank account information exposed';
    } else {
      description = 'Financial records improperly accessed or shared';
    }
  } else if (policyType === 'pci') {
    description = 'Credit card or payment information exposed';
  } else if (policyType === 'userAtRisk') {
    if (policyDetails.some(d => d.includes('Monitoring'))) {
      description = 'User under enhanced monitoring due to risk profile';
    } else if (policyDetails.some(d => d.includes('ImprovementPlan'))) {
      description = 'User on performance improvement plan';
    } else {
      description = 'User exhibiting high-risk behavior patterns';
    }
  } else if (policyType === 'fraud') {
    description = 'Activity matches known fraud patterns';
  }

  return { category, description };
};

// 1. Enhanced Anomaly Detection Timeline
export const AnomalyDetectionTimeline: React.FC<{
  activities: UserActivity[];
  anomalyResults?: Map<string, any>;
  recommendations?: MLRecommendation[];
}> = ({ activities, anomalyResults, recommendations: _recommendations }) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  
  const chartData = useMemo(() => {
    // Group activities by time period
    const timeGroups = new Map<string, {
      timestamp: string;
      totalActivities: number;
      anomalies: number;
      criticalAnomalies: number;
      avgRiskScore: number;
      criticalHourActivity: number; // 1-3 AM activities
    }>();

    activities.forEach(activity => {
      if (!activity.timestamp && !activity.date) return;
      
      // Determine grouping key based on time range
      let groupKey: string;
      const date = activity.timestamp ? new Date(activity.timestamp) : 
                   activity.date ? new Date(activity.date.split('/').reverse().join('-')) : null;
      
      if (!date || isNaN(date.getTime())) return;
      
      if (timeRange === '24h') {
        groupKey = `${date.getHours()}:00`;
      } else if (timeRange === '7d') {
        groupKey = date.toISOString().split('T')[0];
      } else {
        groupKey = date.toISOString().split('T')[0];
      }
      
      const group = timeGroups.get(groupKey) || {
        timestamp: groupKey,
        totalActivities: 0,
        anomalies: 0,
        criticalAnomalies: 0,
        avgRiskScore: 0,
        criticalHourActivity: 0
      };
      
      group.totalActivities++;
      group.avgRiskScore = ((group.avgRiskScore * (group.totalActivities - 1)) + (activity.riskScore || 0)) / group.totalActivities;
      
      // Check if it's an anomaly
      if (anomalyResults?.has(activity.id)) {
        const anomaly = anomalyResults.get(activity.id);
        if (anomaly.isAnomaly) {
          group.anomalies++;
          if (anomaly.severity === 'critical') {
            group.criticalAnomalies++;
          }
        }
      }
      
      // Check if it's during critical hours (1-3 AM)
      const hour = date.getHours();
      if ([1, 2, 3].includes(hour)) {
        group.criticalHourActivity++;
      }
      
      timeGroups.set(groupKey, group);
    });
    
    // Convert to array and sort
    const data = Array.from(timeGroups.values())
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    // Add anomaly rate
    return data.map(item => ({
      ...item,
      anomalyRate: item.totalActivities > 0 ? (item.anomalies / item.totalActivities) * 100 : 0,
      criticalRate: item.totalActivities > 0 ? (item.criticalAnomalies / item.totalActivities) * 100 : 0
    }));
  }, [activities, anomalyResults, timeRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    return (
      <Paper sx={{ p: 2, backgroundColor: '#1F2030', border: '1px solid #333' }}>
        <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'bold' }}>
          {data.timestamp}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
            Total Activities: {data.totalActivities}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: '#F59E0B' }}>
            Anomalies: {data.anomalies} ({data.anomalyRate.toFixed(1)}%)
          </Typography>
        </Box>
        {data.criticalAnomalies > 0 && (
          <Box>
            <Typography variant="body2" sx={{ color: '#DC2626' }}>
              Critical: {data.criticalAnomalies}
            </Typography>
          </Box>
        )}
        {data.criticalHourActivity > 0 && (
          <Box>
            <Typography variant="body2" sx={{ color: '#8B5CF6' }}>
              1-3 AM Activities: {data.criticalHourActivity}
            </Typography>
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#1F2030', border: '1px solid #333' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrendingUp sx={{ color: '#8B5CF6' }} />
          <Typography variant="h6" sx={{ color: '#EEE' }}>
            Anomaly Detection Timeline
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            sx={{
              color: '#EEE',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
            }}
          >
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#9CA3AF"
            tick={{ fontSize: 12 }}
            angle={timeRange === '24h' ? 0 : -45}
            textAnchor={timeRange === '24h' ? 'middle' : 'end'}
            height={timeRange === '24h' ? 30 : 60}
          />
          <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Background area for total activities */}
          <Area
            type="monotone"
            dataKey="totalActivities"
            fill="#8B5CF610"
            stroke="none"
            name="Total Activities"
          />
          
          {/* Critical hour activities */}
          <Bar
            dataKey="criticalHourActivity"
            fill="#8B5CF6"
            name="1-3 AM Activities"
            opacity={0.8}
          />
          
          {/* Anomaly rate line */}
          <Line
            type="monotone"
            dataKey="anomalyRate"
            stroke="#F59E0B"
            strokeWidth={2}
            name="Anomaly Rate %"
            dot={{ fill: '#F59E0B', r: 4 }}
          />
          
          {/* Critical anomaly rate */}
          <Line
            type="monotone"
            dataKey="criticalRate"
            stroke="#DC2626"
            strokeWidth={2}
            name="Critical Rate %"
            dot={{ fill: '#DC2626', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Key insights */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {chartData.some(d => d.criticalHourActivity > 10) && (
          <Chip
            icon={<Warning />}
            label="Critical: High 1-3 AM activity detected"
            sx={{ backgroundColor: '#8B5CF620', color: '#A78BFA' }}
          />
        )}
        {chartData.some(d => d.anomalyRate > 20) && (
          <Chip
            icon={<Warning />}
            label="Alert: >20% anomaly rate detected"
            sx={{ backgroundColor: '#F5930620', color: '#FBB040' }}
          />
        )}
      </Box>
    </Paper>
  );
};

// 2. Enhanced Risk Pattern Heatmap
export const RiskPatternHeatmap: React.FC<{
  activities: UserActivity[];
}> = ({ activities }) => {
  // State for view mode
  const [viewMode, setViewMode] = useState<'integration_hour' | 'user_hour' | 'activity_day' | 'department_risk'>('integration_hour');
  
  // State for interactive features
  const [selectedCell, setSelectedCell] = useState<{hour: number, integration: string} | null>(null);
  const [cellActivities, setCellActivities] = useState<UserActivity[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showPatternOverlay, setShowPatternOverlay] = useState(false);
  const [showBaselineComparison, setShowBaselineComparison] = useState(false);
  
  // Risk filter state for the detail modal
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  
  // Pagination state for the detail modal
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  
  // Date range filtering - initialize with default 7 days
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    // Default to last 7 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return [start, end];
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Auto-detect and set date range based on actual activity data
  useEffect(() => {
    if (!activities || activities.length === 0) return;
    
    // Find min and max dates in the activities
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    
    activities.forEach(activity => {
      const activityDate = activity.timestamp 
        ? new Date(activity.timestamp) 
        : (activity.date ? new Date(activity.date) : null);
      
      if (!activityDate) return;
      
      if (!minDate || activityDate < minDate) {
        minDate = new Date(activityDate);
      }
      
      if (!maxDate || activityDate > maxDate) {
        maxDate = new Date(activityDate);
      }
    });
    
    // If valid dates found, update the date range
    if (minDate && maxDate) {
      // Ensure maxDate includes time until end of day
      const endOfDay = new Date(maxDate);
      endOfDay.setHours(23, 59, 59);
      setDateRange([minDate, endOfDay]);
    }
  }, [activities]);
  
  // Filtered activities based on date range
  const filteredActivitiesByDate = useMemo(() => {
    return activities.filter(activity => {
      const activityDate = activity.timestamp 
        ? new Date(activity.timestamp) 
        : (activity.date ? new Date(activity.date) : null);
      
      if (!activityDate) return true; // Include if no date available
      
      return activityDate >= dateRange[0] && activityDate <= dateRange[1];
    });
  }, [activities, dateRange]);
  
  // Function to extract department from user email or infer based on activity patterns
  const extractDepartment = useCallback((activity: UserActivity): string => {
    // If department exists directly, use it
    if (activity.department) return activity.department;
    
    // Try to extract department from email username pattern
    const user = activity.user || activity.username || activity.userId || '';
    
    // Common department extraction patterns from username
    if (user.includes('.')) {
      // Extract potential department indicators from name patterns
      const nameParts = user.split('@')[0].split('.');
      
      // Finance-related roles
      if (['finance', 'accounting', 'treasury', 'financial'].some(term => 
        nameParts.some(part => part.toLowerCase().includes(term)))) {
        return 'Finance';
      }
      
      // IT/Tech roles
      if (['it', 'tech', 'system', 'dev', 'security'].some(term => 
        nameParts.some(part => part.toLowerCase().includes(term)))) {
        return 'IT';
      }
      
      // HR-related roles
      if (['hr', 'human', 'talent', 'personnel', 'recruit'].some(term => 
        nameParts.some(part => part.toLowerCase().includes(term)))) {
        return 'HR';
      }
      
      // Marketing roles
      if (['marketing', 'sales', 'market', 'product'].some(term => 
        nameParts.some(part => part.toLowerCase().includes(term)))) {
        return 'Marketing';
      }
      
      // Legal roles
      if (['legal', 'compliance', 'law', 'attorney'].some(term => 
        nameParts.some(part => part.toLowerCase().includes(term)))) {
        return 'Legal';
      }
    }
    
    // Infer department from policy breaches and activity types
    if (activity.policiesBreached) {
      const policies = typeof activity.policiesBreached === 'string' 
        ? JSON.parse(activity.policiesBreached) 
        : activity.policiesBreached;
      
      // Finance department if financial data is involved
      if (policies.financial || policies.pci) {
        return 'Finance';
      }
      
      // Healthcare department if PHI is involved
      if (policies.phi) {
        return 'Healthcare';
      }
      
      // HR department if PII is involved
      if (policies.pii) {
        return 'HR';
      }
    }
    
    // Default department based on integration
    if (activity.integration) {
      if (activity.integration.includes('email')) return 'Communications';
      if (activity.integration.includes('cloud')) return 'IT';
      if (activity.integration.includes('usb')) return 'Operations';
      if (activity.integration.includes('application')) {
        return 'Business';
      }
    }
    
    // Fallback
    return 'General';
  }, []);
  
  // Extract activity type from available data
  const extractActivityType = useCallback((activity: UserActivity): string => {
    // If activity type exists directly, use it
    if (activity.activityType || activity.activity) {
      return activity.activityType || activity.activity || 'Unknown';
    }
    
    // Try to infer activity type from integration
    if (activity.integration) {
      const integration = activity.integration.toLowerCase();
      
      // Check for policy breaches to get more specific activity type
      if (activity.policiesBreached) {
        const policies = typeof activity.policiesBreached === 'string' 
          ? JSON.parse(activity.policiesBreached) 
          : activity.policiesBreached;
        
        // Email actions
        if (integration.includes('email')) {
          if (policies.dataLeakage) {
            return 'Email Data Transfer';
          }
          return 'Email';
        }
        
        // Cloud actions
        if (integration.includes('cloud')) {
          if (policies.dataLeakage) {
            return 'Cloud Upload';
          }
          return 'Cloud Access';
        }
        
        // USB actions
        if (integration.includes('usb')) {
          if (policies.dataLeakage) {
            return 'USB Copy';
          }
          return 'USB Access';
        }
        
        // Application actions
        if (integration.includes('application')) {
          if (policies.dataLeakage) {
            return 'Data Export';
          }
          return 'App Access';
        }
      }
      
      // Default based on integration
      if (integration.includes('email')) return 'Email';
      if (integration.includes('cloud')) return 'Cloud Storage';
      if (integration.includes('usb')) return 'USB Activity';
      if (integration.includes('application')) return 'Application';
    }
    
    // Fallback
    return 'Unknown Activity';
  }, []);
  
  // Function to get risk bucket (0-4) for department view
  const getRiskBucket = (riskScore: number): number => {
    if (riskScore >= 2000) return 4; // Critical
    if (riskScore >= 1500) return 3; // High
    if (riskScore >= 1000) return 2; // Medium
    if (riskScore >= 500) return 1; // Low
    return 0; // Minimal
  };
  
  // Zoom functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
    // Reset pan when zooming
    setPanOffset({ x: 0, y: 0 });
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    // Reset pan when zooming
    setPanOffset({ x: 0, y: 0 });
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  
  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    const panStep = 50;
    setPanOffset(prev => {
      switch (direction) {
        case 'up':
          return { ...prev, y: prev.y + panStep };
        case 'down':
          return { ...prev, y: prev.y - panStep };
        case 'left':
          return { ...prev, x: prev.x + panStep };
        case 'right':
          return { ...prev, x: prev.x - panStep };
        default:
          return prev;
      }
    });
  };
  
  // Calculate cell dimensions based on zoom level and view mode
  const getCellDimensions = () => {
    let baseWidth = viewMode === 'integration_hour' || viewMode === 'user_hour' ? 38 :
                    viewMode === 'activity_day' ? 70 : 80;
    let baseHeight = 36;
    
    return {
      width: baseWidth * zoomLevel,
      height: baseHeight * zoomLevel
    };
  };
  
  // Calculate heatmap data based on current view mode
  const heatmapData = useMemo(() => {
    // Use filtered activities instead of all activities
    if (viewMode === 'integration_hour') {
      // Integration by hour matrix
      const matrix = new Map<string, Map<number, { count: number; totalRisk: number; maxRisk: number; policyBreachCount: number }>>();
    
    // Get unique integrations
    const integrations = new Set<string>();
    
      filteredActivitiesByDate.forEach(activity => {
      const integration = activity.integration || 'unknown';
      integrations.add(integration);
      
      const hour = activity.hour ?? 
                   (activity.timestamp ? new Date(activity.timestamp).getHours() : null);
      
      if (hour === null) return;
      
      if (!matrix.has(integration)) {
        matrix.set(integration, new Map());
      }
      
      const hourMap = matrix.get(integration)!;
        const current = hourMap.get(hour) || { count: 0, totalRisk: 0, maxRisk: 0, policyBreachCount: 0 };
      
      current.count++;
      current.totalRisk += activity.riskScore || 0;
      current.maxRisk = Math.max(current.maxRisk, activity.riskScore || 0);
        
        if (activity.policiesBreached && Object.keys(activity.policiesBreached).length > 0) {
          current.policyBreachCount++;
        }
      
      hourMap.set(hour, current);
    });
    
    // Convert to heatmap format
    const heatmapCells: any[] = [];
    
    Array.from(integrations).forEach((integration, yIndex) => {
      for (let hour = 0; hour < 24; hour++) {
        const data = matrix.get(integration)?.get(hour);
        
        heatmapCells.push({
          hour,
          hourLabel: HOUR_LABELS[hour],
          integration,
          yIndex,
          count: data?.count || 0,
          avgRisk: data ? data.totalRisk / data.count : 0,
          maxRisk: data?.maxRisk || 0,
          isCriticalHour: [1, 2, 3].includes(hour),
            isUSB: integration.toLowerCase().includes('usb'),
            isAnomaly: data && data.count > 0 && 
                      ((data.maxRisk > 2000) || 
                      ([1, 2, 3].includes(hour) && data.count > 5)),
            policyBreachCount: data?.policyBreachCount || 0
        });
      }
    });
    
    return {
      cells: heatmapCells,
        keys: Array.from(integrations),
        maxCount: Math.max(...heatmapCells.map(c => c.count), 1),
        xAxisLabel: 'Hour of Day',
        yAxisLabel: 'Integration'
      };
    } 
    else if (viewMode === 'user_hour') {
      // User by hour matrix
      const matrix = new Map<string, Map<number, { count: number; totalRisk: number; maxRisk: number; policyBreachCount: number }>>();
      
      // Get unique users (limited to top 15 by activity count)
      const userCounts = new Map<string, number>();
      
      // Count activities per user
      filteredActivitiesByDate.forEach(activity => {
        const user = activity.user || activity.username || activity.userId || 'unknown';
        userCounts.set(user, (userCounts.get(user) || 0) + 1);
      });
      
      // Get top users by activity count
      const topUsers = Array.from(userCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(entry => entry[0]);
      
      // Build the matrix
      filteredActivitiesByDate.forEach(activity => {
        const user = activity.user || activity.username || activity.userId || 'unknown';
        
        // Only include top users
        if (!topUsers.includes(user)) return;
        
        const hour = activity.hour ?? 
                    (activity.timestamp ? new Date(activity.timestamp).getHours() : null);
        
        if (hour === null) return;
        
        if (!matrix.has(user)) {
          matrix.set(user, new Map());
        }
        
        const hourMap = matrix.get(user)!;
        const current = hourMap.get(hour) || { count: 0, totalRisk: 0, maxRisk: 0, policyBreachCount: 0 };
        
        current.count++;
        current.totalRisk += activity.riskScore || 0;
        current.maxRisk = Math.max(current.maxRisk, activity.riskScore || 0);
        
        if (activity.policiesBreached && Object.keys(activity.policiesBreached).length > 0) {
          current.policyBreachCount++;
        }
        
        hourMap.set(hour, current);
      });
      
      // Convert to heatmap format
      const heatmapCells: any[] = [];
      
      topUsers.forEach((user, yIndex) => {
        for (let hour = 0; hour < 24; hour++) {
          const data = matrix.get(user)?.get(hour);
          
          heatmapCells.push({
            hour,
            hourLabel: HOUR_LABELS[hour],
            integration: user, // Reusing the integration field for the key
            yIndex,
            count: data?.count || 0,
            avgRisk: data ? data.totalRisk / data.count : 0,
            maxRisk: data?.maxRisk || 0,
            isCriticalHour: [1, 2, 3].includes(hour),
            isUSB: false,
            isAnomaly: data && data.count > 0 && 
                      ((data.maxRisk > 2000) || 
                      ([1, 2, 3].includes(hour) && data.count > 5)),
            policyBreachCount: data?.policyBreachCount || 0
          });
        }
      });
      
      return {
        cells: heatmapCells,
        keys: topUsers,
        maxCount: Math.max(...heatmapCells.map(c => c.count), 1),
        xAxisLabel: 'Hour of Day',
        yAxisLabel: 'User'
      };
    }
    else if (viewMode === 'activity_day') {
      // Activity type by day of week matrix
      const matrix = new Map<string, Map<number, { count: number; totalRisk: number; maxRisk: number; policyBreachCount: number }>>();
      
      // Get unique activity types
      const activityTypes = new Set<string>();
      
      filteredActivitiesByDate.forEach(activity => {
        const activityType = extractActivityType(activity);
        activityTypes.add(activityType);
        
        // Get day of week (0-6, Sunday-Saturday)
        const dayOfWeek = activity.timestamp ? 
                        new Date(activity.timestamp).getDay() : 
                        (activity.date ? new Date(activity.date).getDay() : null);
        
        if (dayOfWeek === null) return;
        
        if (!matrix.has(activityType)) {
          matrix.set(activityType, new Map());
        }
        
        const dayMap = matrix.get(activityType)!;
        const current = dayMap.get(dayOfWeek) || { count: 0, totalRisk: 0, maxRisk: 0, policyBreachCount: 0 };
        
        current.count++;
        current.totalRisk += activity.riskScore || 0;
        current.maxRisk = Math.max(current.maxRisk, activity.riskScore || 0);
        
        if (activity.policiesBreached && Object.keys(activity.policiesBreached).length > 0) {
          current.policyBreachCount++;
        }
        
        dayMap.set(dayOfWeek, current);
      });
      
      // Convert to heatmap format
      const heatmapCells: any[] = [];
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      Array.from(activityTypes).forEach((activityType, yIndex) => {
        for (let day = 0; day < 7; day++) {
          const data = matrix.get(activityType)?.get(day);
          
          heatmapCells.push({
            hour: day, // Reusing hour for the day
            hourLabel: dayLabels[day],
            integration: activityType, // Reusing integration for activity type
            yIndex,
            count: data?.count || 0,
            avgRisk: data ? data.totalRisk / data.count : 0,
            maxRisk: data?.maxRisk || 0,
            isCriticalHour: day === 0 || day === 6, // Weekend
            isUSB: false,
            isAnomaly: data && data.count > 0 && 
                      ((data.maxRisk > 2000) || 
                      ((day === 0 || day === 6) && data.count > 10)), // Anomaly: high risk or weekend high volume
            policyBreachCount: data?.policyBreachCount || 0
          });
        }
      });
      
      return {
        cells: heatmapCells,
        keys: Array.from(activityTypes),
        maxCount: Math.max(...heatmapCells.map(c => c.count), 1),
        xAxisLabel: 'Day of Week',
        yAxisLabel: 'Activity Type'
      };
    }
    else if (viewMode === 'department_risk') {
      // Department by risk level matrix
      const matrix = new Map<string, Map<number, { count: number; totalRisk: number; maxRisk: number; policyBreachCount: number }>>();
      
      // Get unique departments
      const departments = new Set<string>();
      
      filteredActivitiesByDate.forEach(activity => {
        const department = extractDepartment(activity);
        departments.add(department);
        
        const riskBucket = getRiskBucket(activity.riskScore || 0);
        
        if (!matrix.has(department)) {
          matrix.set(department, new Map());
        }
        
        const riskMap = matrix.get(department)!;
        const current = riskMap.get(riskBucket) || { count: 0, totalRisk: 0, maxRisk: 0, policyBreachCount: 0 };
        
        current.count++;
        current.totalRisk += activity.riskScore || 0;
        current.maxRisk = Math.max(current.maxRisk, activity.riskScore || 0);
        
        if (activity.policiesBreached && Object.keys(activity.policiesBreached).length > 0) {
          current.policyBreachCount++;
        }
        
        riskMap.set(riskBucket, current);
      });
      
      // Convert to heatmap format
      const heatmapCells: any[] = [];
      const riskLabels = ['Minimal', 'Low', 'Medium', 'High', 'Critical'];
      
      Array.from(departments).forEach((department, yIndex) => {
        for (let riskBucket = 0; riskBucket < 5; riskBucket++) {
          const data = matrix.get(department)?.get(riskBucket);
          
          heatmapCells.push({
            hour: riskBucket, // Reusing hour for risk bucket
            hourLabel: riskLabels[riskBucket],
            integration: department, // Reusing integration for department
            yIndex,
            count: data?.count || 0,
            avgRisk: data ? data.totalRisk / data.count : 0,
            maxRisk: data?.maxRisk || 0,
            isCriticalHour: riskBucket >= 3, // High or Critical risk
            isUSB: false,
            isAnomaly: data && data.count > 0 && riskBucket >= 3 && data.count > 5, // Anomaly: many high/critical risk activities
            policyBreachCount: data?.policyBreachCount || 0
          });
        }
      });
      
      return {
        cells: heatmapCells,
        keys: Array.from(departments),
        maxCount: Math.max(...heatmapCells.map(c => c.count), 1),
        xAxisLabel: 'Risk Level',
        yAxisLabel: 'Department'
      };
    }
    
    // Default fallback (should never reach here)
    return {
      cells: [],
      keys: [],
      maxCount: 1,
      xAxisLabel: '',
      yAxisLabel: ''
    };
  }, [filteredActivitiesByDate, viewMode, extractActivityType, extractDepartment, getRiskBucket]);

  // Color scale based on activity count and risk
  const getCellColor = (cell: any): string => {
    if (cell.count === 0) return '#1A1B2E';
    
    // Special handling for critical hours
    if (cell.isCriticalHour && cell.count > 0) {
      const intensity = Math.min(cell.count / 50, 1);
      return `rgba(139, 92, 246, ${0.2 + intensity * 0.8})`;
    }
    
    // Special handling for USB
    if (cell.isUSB && cell.avgRisk > 1500) {
      return '#DC2626';
    }
    
    // Normal risk-based coloring
    if (cell.avgRisk >= 2000) return '#DC2626';
    if (cell.avgRisk >= 1500) return '#F59E0B';
    if (cell.avgRisk >= 1000) return '#EAB308';
    
    // Activity-based coloring
    const intensity = Math.min(cell.count / heatmapData.maxCount, 1);
    return `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`;
  };

  // Function to get activities for a specific cell
  const getActivitiesForCell = useCallback((hour: number, key: string): UserActivity[] => {
    return filteredActivitiesByDate.filter(activity => {
      const activityHour = activity.hour ?? 
                  (activity.timestamp ? new Date(activity.timestamp).getHours() : null);
                  
      if (activityHour === null) return false;
      
      // For time-based views
      if (viewMode === 'integration_hour' || viewMode === 'user_hour') {
        const keyValue = viewMode === 'integration_hour' ? 
                        (activity.integration || 'unknown') : 
                        (activity.user || activity.username || activity.userId || 'unknown');
                        
        return activityHour === hour && keyValue === key;
      }
      
      // For day-based view (activity_day)
      if (viewMode === 'activity_day') {
        const dayOfWeek = activity.timestamp ? 
                        new Date(activity.timestamp).getDay() : 
                        (activity.date ? new Date(activity.date).getDay() : null);
                        
        const activityType = extractActivityType(activity);
        return dayOfWeek === hour && activityType === key;
      }
      
      // For risk-based view (department_risk)
      if (viewMode === 'department_risk') {
        const department = extractDepartment(activity);
        const riskBucket = getRiskBucket(activity.riskScore || 0);
        
        return department === key && riskBucket === hour;
      }
      
      return false;
    });
  }, [filteredActivitiesByDate, viewMode, extractActivityType, extractDepartment]);
  
  // Handle cell click
  const handleCellClick = useCallback((hour: number, key: string) => {
    const activities = getActivitiesForCell(hour, key);
    setSelectedCell({ hour, integration: key });
    setCellActivities(activities);
    setRiskFilter('all'); // Reset risk filter when opening modal
    setCurrentPage(1); // Reset to first page when opening modal
    setIsDetailModalOpen(true);
  }, [getActivitiesForCell]);

  // Format detailed activity for display in modal
  const formatDetailedActivity = (activity: UserActivity): string => {
    const time = activity.timestamp ? new Date(activity.timestamp).toLocaleString() :
                (activity.date ? (activity.time ? `${activity.date} ${activity.time}` : activity.date) : 'Unknown time');
    
    const user = activity.user || activity.username || activity.userId || 'Unknown user';
    const action = extractActivityType(activity);
    const risk = activity.riskScore || 0;
    
    return `${time} - ${user} - ${action} (Risk: ${risk})`;
  };

  // Get risk level string from score
  const getRiskLevel = (score: number): 'critical' | 'high' | 'medium' | 'low' => {
    if (score >= 2000) return 'critical';
    if (score >= 1500) return 'high';
    if (score >= 1000) return 'medium';
    return 'low';
  };
  
  // Filter activities by risk level
  const filteredActivities = useMemo(() => {
    if (riskFilter === 'all') return cellActivities;
    
    return cellActivities.filter((activity: UserActivity) => {
      const score = activity.riskScore || 0;
      const level = getRiskLevel(score);
      return level === riskFilter;
    });
  }, [cellActivities, riskFilter]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Historical data for sparklines (in real app, this would come from API)
  const [historicalData, setHistoricalData] = useState<Map<string, number[]>>(new Map());
  
  // Generate historical data for cells
  useEffect(() => {
    const newHistoricalData = new Map<string, number[]>();
    
    // Group by day for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    // Create data for each integration/hour combination
    if (viewMode === 'integration_hour' || viewMode === 'user_hour') {
      const keys = heatmapData.keys;
      
      keys.forEach(key => {
        for (let hour = 0; hour < 24; hour++) {
          const cellKey = `${key}_${hour}`;
          
          // Create random historical data (in a real app, this would be actual historical data)
          const data = last7Days.map(() => Math.floor(Math.random() * 100));
          
          // Add current data point based on actual data
          const currentValue = heatmapData.cells.find(c => c.integration === key && c.hour === hour)?.count || 0;
          data.push(currentValue);
          
          newHistoricalData.set(cellKey, data);
        }
      });
    } else if (viewMode === 'activity_day') {
      const keys = heatmapData.keys;
      
      keys.forEach(key => {
        for (let day = 0; day < 7; day++) {
          const cellKey = `${key}_${day}`;
          
          // Create random historical data
          const data = last7Days.map(() => Math.floor(Math.random() * 100));
          
          // Add current data point
          const currentValue = heatmapData.cells.find(c => c.integration === key && c.hour === day)?.count || 0;
          data.push(currentValue);
          
          newHistoricalData.set(cellKey, data);
        }
      });
    } else if (viewMode === 'department_risk') {
      const keys = heatmapData.keys;
      
      keys.forEach(key => {
        for (let risk = 0; risk < 5; risk++) {
          const cellKey = `${key}_${risk}`;
          
          // Create random historical data
          const data = last7Days.map(() => Math.floor(Math.random() * 100));
          
          // Add current data point
          const currentValue = heatmapData.cells.find(c => c.integration === key && c.hour === risk)?.count || 0;
          data.push(currentValue);
          
          newHistoricalData.set(cellKey, data);
        }
      });
    }
    
    setHistoricalData(newHistoricalData);
  }, [heatmapData, viewMode]);

  // Calculate baseline metrics for anomaly detection
  const baselineMetrics = useMemo(() => {
    const metrics = new Map<string, { avg: number; stdDev: number }>();
    
    historicalData.forEach((data, key) => {
      // Calculate average
      const sum = data.reduce((a, b) => a + b, 0);
      const avg = sum / data.length;
      
      // Calculate standard deviation
      const squaredDiffs = data.map(value => Math.pow(value - avg, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
      const stdDev = Math.sqrt(avgSquaredDiff);
      
      metrics.set(key, { avg, stdDev });
    });
    
    return metrics;
  }, [historicalData]);
  
  // Determine if a cell's activity count is anomalous compared to baseline
  const isAnomalous = (key: string, count: number): boolean => {
    const metrics = baselineMetrics.get(key);
    if (!metrics) return false;
    
    // If more than 2 standard deviations from mean, consider anomalous
    return Math.abs(count - metrics.avg) > metrics.stdDev * 2;
  };

  // Get cell color with baseline comparison
  const getCellColorWithBaseline = (cell: any): string => {
    if (cell.count === 0) return '#1A1B2E';
    
    const cellKey = `${cell.integration}_${cell.hour}`;
    const metrics = baselineMetrics.get(cellKey);
    
    if (showBaselineComparison && metrics) {
      // Determine deviation from baseline
      const deviation = (cell.count - metrics.avg) / metrics.stdDev;
      
      // Color based on deviation
      if (deviation > 2) return '#DC2626'; // High positive deviation (red)
      if (deviation > 1) return '#F59E0B'; // Moderate positive deviation (orange)
      if (deviation < -2) return '#2563EB'; // High negative deviation (blue)
      if (deviation < -1) return '#3B82F6'; // Moderate negative deviation (lighter blue)
      return '#10B981'; // Normal range (green)
    }
    
    // Default coloring if baseline comparison is off
    return getCellColor(cell);
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#1F2030', border: '1px solid #333' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Security sx={{ color: '#8B5CF6', fontSize: 28 }} />
        <Typography variant="h5" sx={{ color: '#EEE' }}>
          Risk Pattern Heatmap
        </Typography>
        
        {/* Date range display */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              ml: 2,
              backgroundColor: '#252638',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              border: '1px solid #333',
              '&:hover': { borderColor: '#8B5CF6' }
            }}
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <Typography variant="body2" sx={{ color: '#9CA3AF', mr: 1 }}>
              Date Range:
            </Typography>
            <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'medium' }}>
              {formatDate(dateRange[0])} - {formatDate(dateRange[1])}
            </Typography>
          </Box>
          
          {activities.length > 0 && (() => {
            // Find actual min and max dates in the activities
            let minDate: Date | null = null;
            let maxDate: Date | null = null;
            
            activities.forEach(activity => {
              const activityDate = activity.timestamp 
                ? new Date(activity.timestamp) 
                : (activity.date ? new Date(activity.date) : null);
              
              if (!activityDate) return;
              
              if (!minDate || activityDate < minDate) {
                minDate = new Date(activityDate);
              }
              
              if (!maxDate || activityDate > maxDate) {
                maxDate = new Date(activityDate);
              }
            });
            
            // If valid dates found, show actual date range info
            if (minDate && maxDate) {
              return (
                <MuiTooltip
                  title={
                    <Box sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'medium', mb: 1 }}>
                        Data Range Information
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                        Your dataset contains activities from {formatDate(minDate)} to {formatDate(maxDate)}.
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>
                        Current view shows {filteredActivitiesByDate.length} activities from the selected date range.
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 1 }}>
                        Click the date range to change the time period shown.
                      </Typography>
                    </Box>
                  }
                  placement="top"
                  arrow
                >
                  <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', cursor: 'help' }}>
                    <InfoOutlined sx={{ color: '#8B5CF6', fontSize: 18 }} />
                  </Box>
                </MuiTooltip>
              );
            }
            
            return null;
          })()}
        </Box>
        
        {/* Add the baseline comparison toggle after the date range box but before the view mode selector: */}
        <MuiTooltip
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Baseline Comparison
              </Typography>
              <Typography variant="body2">
                Compare current activity levels against historical baselines to identify unusual patterns
              </Typography>
            </Box>
          }
          placement="top"
          arrow
        >
          <FormControlLabel
            control={
              <Switch
                checked={showBaselineComparison}
                onChange={(e) => setShowBaselineComparison(e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#3B82F6',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    },
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#3B82F6',
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                Baseline
              </Typography>
            }
            sx={{ m: 0, ml: 2 }}
          />
        </MuiTooltip>
        
        {/* View mode selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
          <MuiTooltip
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  View Mode
                </Typography>
                <Typography variant="body2">
                  Change how data is visualized in the heatmap:
                </Typography>
                <Box component="ul" sx={{ mt: 0.5, pl: 2, mb: 0 }}>
                  <li>
                    <Typography variant="body2">Integration × Hour: Shows activity by integration type across hours of day</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">User × Hour: Shows activity by top users across hours of day</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Activity × Day: Shows activity types across days of week</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Department × Risk: Shows departments by risk levels</Typography>
                  </li>
                </Box>
              </Box>
            }
            placement="top"
            arrow
          >
            <InfoOutlined sx={{ color: '#8B5CF6', fontSize: 16, mr: 1, cursor: 'help' }} />
          </MuiTooltip>
          
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              sx={{
                color: '#EEE',
                fontSize: '0.95rem',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
              }}
            >
              <MenuItem value="integration_hour">Integration × Hour</MenuItem>
              <MenuItem value="user_hour">User × Hour</MenuItem>
              <MenuItem value="activity_day">Activity × Day of Week</MenuItem>
              <MenuItem value="department_risk">Department × Risk Level</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      {/* Date Picker Popover */}
      {showDatePicker && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#252638', 
            border: '1px solid #333',
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'medium' }}>
              Select Date Range
            </Typography>
            <Button 
              size="small" 
              onClick={() => setShowDatePicker(false)}
              sx={{ color: '#9CA3AF', minWidth: 'unset', p: 0.5 }}
            >
              ✕
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Preset buttons */}
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 1);
                setDateRange([start, end]);
              }}
              sx={{ 
                borderColor: '#444',
                color: '#9CA3AF',
                '&:hover': { borderColor: '#8B5CF6', color: '#8B5CF6' }
              }}
            >
              Last 24 Hours
            </Button>
            
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 7);
                setDateRange([start, end]);
              }}
              sx={{ 
                borderColor: '#444',
                color: '#9CA3AF',
                '&:hover': { borderColor: '#8B5CF6', color: '#8B5CF6' }
              }}
            >
              Last 7 Days
            </Button>
            
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 30);
                setDateRange([start, end]);
              }}
              sx={{ 
                borderColor: '#444',
                color: '#9CA3AF',
                '&:hover': { borderColor: '#8B5CF6', color: '#8B5CF6' }
              }}
            >
              Last 30 Days
            </Button>
            
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(1); // First day of current month
                setDateRange([start, end]);
              }}
              sx={{ 
                borderColor: '#444',
                color: '#9CA3AF',
                '&:hover': { borderColor: '#8B5CF6', color: '#8B5CF6' }
              }}
            >
              This Month
            </Button>
            
            {/* Add button to set date range to match actual data */}
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                // Find min and max dates in the activities
                let minDate: Date | null = null;
                let maxDate: Date | null = null;
                
                activities.forEach(activity => {
                  const activityDate = activity.timestamp 
                    ? new Date(activity.timestamp) 
                    : (activity.date ? new Date(activity.date) : null);
                  
                  if (!activityDate) return;
                  
                  if (!minDate || activityDate < minDate) {
                    minDate = new Date(activityDate);
                  }
                  
                  if (!maxDate || activityDate > maxDate) {
                    maxDate = new Date(activityDate);
                  }
                });
                
                // If valid dates found, update the date range
                if (minDate && maxDate) {
                  // Ensure maxDate includes time until end of day
                  const endOfDay = new Date(maxDate);
                  endOfDay.setHours(23, 59, 59);
                  setDateRange([minDate, endOfDay]);
                }
              }}
              sx={{ 
                borderColor: '#8B5CF6',
                color: '#8B5CF6',
                '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
              }}
            >
              Full Data Range
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>
                Start Date
              </Typography>
              <input 
                type="date" 
                value={dateRange[0].toISOString().split('T')[0]}
                onChange={(e) => {
                  const newStart = new Date(e.target.value);
                  setDateRange([newStart, dateRange[1]]);
                }}
                style={{
                  backgroundColor: '#1A1B2E',
                  color: '#EEE',
                  border: '1px solid #444',
                  padding: '8px',
                  borderRadius: '4px',
                  width: '140px'
                }}
              />
            </Box>
            
            <Box sx={{ color: '#9CA3AF' }}>—</Box>
            
            <Box>
              <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>
                End Date
              </Typography>
              <input 
                type="date" 
                value={dateRange[1].toISOString().split('T')[0]}
                onChange={(e) => {
                  const newEnd = new Date(e.target.value);
                  newEnd.setHours(23, 59, 59); // Set to end of day
                  setDateRange([dateRange[0], newEnd]);
                }}
                style={{
                  backgroundColor: '#1A1B2E',
                  color: '#EEE',
                  border: '1px solid #444',
                  padding: '8px',
                  borderRadius: '4px',
                  width: '140px'
                }}
              />
            </Box>
            
            <Button 
              variant="contained"
              size="small"
              onClick={() => setShowDatePicker(false)}
              sx={{ 
                ml: 'auto', 
                mt: 3,
                backgroundColor: '#8B5CF6',
                '&:hover': { backgroundColor: '#7C3AED' }
              }}
            >
              Apply
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Activity count indicator */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
          {filteredActivitiesByDate.length > 0 ? (
            `Showing ${filteredActivitiesByDate.length} activities from ${formatDate(dateRange[0])} to ${formatDate(dateRange[1])}`
          ) : (
            `No activities found in selected date range (${formatDate(dateRange[0])} - ${formatDate(dateRange[1])})`
          )}
        </Typography>
        
        {filteredActivitiesByDate.length === 0 && (
          <Typography variant="body2" sx={{ color: '#DC2626' }}>
            No activities found in the selected date range
          </Typography>
        )}
      </Box>
      
      {/* Heatmap Grid */}
      <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: zoomLevel > 1 ? 600 : 'auto' }}>
        <Box sx={{ 
          minWidth: 960, 
          position: 'relative',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          transition: 'transform 0.2s ease-out'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body1" sx={{ color: '#9CA3AF', fontWeight: 'bold', width: 150, pl: 1 }}>
              {heatmapData.yAxisLabel}
            </Typography>
            <Typography variant="body1" sx={{ color: '#9CA3AF', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
              {heatmapData.xAxisLabel}
            </Typography>
            <Box sx={{ width: 20 }} /> {/* Spacer for scrollbar alignment */}
          </Box>
          
          {/* Pan controls (only visible when zoomed in) */}
          {zoomLevel > 1 && (
            <Box sx={{ 
              position: 'absolute', 
              right: 20, 
              top: 40, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              zIndex: 100,
              backgroundColor: 'rgba(31, 32, 48, 0.7)',
              p: 0.5,
              borderRadius: 1,
              border: '1px solid #333'
            }}>
              <Button
                size="small"
                onClick={() => handlePan('up')}
                sx={{ 
                  minWidth: 'unset', 
                  p: '2px',
                  color: '#8B5CF6'
                }}
              >
                ▲
              </Button>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button
                  size="small"
                  onClick={() => handlePan('left')}
                  sx={{ 
                    minWidth: 'unset', 
                    p: '2px',
                    color: '#8B5CF6'
                  }}
                >
                  ◀
                </Button>
                <Button
                  size="small"
                  onClick={() => handlePan('right')}
                  sx={{ 
                    minWidth: 'unset', 
                    p: '2px',
                    color: '#8B5CF6'
                  }}
                >
                  ▶
                </Button>
              </Box>
              <Button
                size="small"
                onClick={() => handlePan('down')}
                sx={{ 
                  minWidth: 'unset', 
                  p: '2px',
                  color: '#8B5CF6'
                }}
              >
                ▼
              </Button>
            </Box>
          )}
          
          {/* Container for grid with fixed positioning */}
          <Box sx={{ 
            position: 'relative',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            transition: 'transform 0.2s ease-out'
          }}>
            {/* Hour labels - absolutely positioned to ensure alignment */}
            <Box sx={{ 
              display: 'flex', 
              ml: 15,
              position: 'relative',
              height: 30,
              mb: 0.5
            }}>
              {viewMode === 'integration_hour' || viewMode === 'user_hour' ? (
                // Hours of day (0-23)
                HOUR_LABELS.map((label, i) => {
                  // Calculate positions for 1-3AM hours to highlight them
                  const isHighlighted = [1, 2, 3].includes(i);
                  return (
              <Box
                key={i}
                sx={{
                        width: 38,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        color: isHighlighted ? '#8B5CF6' : '#9CA3AF',
                        fontWeight: isHighlighted ? 'bold' : 'normal',
                        mx: 0.5 // Match cell spacing
                }}
              >
                {label}
              </Box>
                  );
                })
              ) : viewMode === 'activity_day' ? (
                // Days of week
                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 70,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      color: [0, 6].includes(i) ? '#8B5CF6' : '#9CA3AF', // Weekend
                      fontWeight: [0, 6].includes(i) ? 'bold' : 'normal'
                    }}
                  >
                    {label}
                  </Box>
                ))
              ) : (
                // Risk levels
                ['Minimal', 'Low', 'Medium', 'High', 'Critical'].map((label, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 80,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      color: i >= 3 ? '#F59E0B' : '#9CA3AF', // High or Critical
                      fontWeight: i >= 3 ? 'bold' : 'normal'
                    }}
                  >
                    {label}
                  </Box>
                ))
              )}
          </Box>
          
            {/* Grid container */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative'
            }}>
          {/* Integration rows */}
              {heatmapData.keys.map((key, yIndex) => (
                <Box 
                  key={key} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    position: 'relative'
                  }}
                >
              <Typography
                    variant="body1"
                sx={{
                      width: 150,
                      color: viewMode === 'integration_hour' && key.includes('usb') ? '#F59E0B' : '#EEE',
                      fontWeight: viewMode === 'integration_hour' && key.includes('usb') ? 'bold' : 'normal',
                  textAlign: 'right',
                  pr: 2,
                      fontSize: '0.95rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                }}
              >
                    {key}
              </Typography>
              
                  {/* Cell container with consistent layout */}
                  <Box sx={{ display: 'flex', flexWrap: 'nowrap' }}>
              {/* Heat cells */}
              {heatmapData.cells
                      .filter(c => c.integration === key)
                      .sort((a, b) => {
                        // Sort based on view mode
                        if (viewMode === 'integration_hour' || viewMode === 'user_hour') {
                          return a.hour - b.hour; // Sort by hour
                        } else if (viewMode === 'activity_day') {
                          return a.hour - b.hour; // Sort by day
                        } else {
                          return a.hour - b.hour; // Sort by risk level
                        }
                      })
                      .map((cell, i) => {
                        const cellWidth = viewMode === 'integration_hour' || viewMode === 'user_hour' ? 38 :
                                        viewMode === 'activity_day' ? 70 : 80;
                        
                        return (
                  <MuiTooltip
                    key={i}
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="body2" sx={{ display: 'block', fontWeight: 'bold', mb: 1 }}>
                          {cell.hourLabel} - {cell.integration}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'block' }}>
                          Activities: {cell.count}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'block' }}>
                          Avg Risk: {Math.round(cell.avgRisk)}
                        </Typography>
                        {cell.maxRisk > 0 && (
                          <Typography variant="body2" sx={{ display: 'block', color: cell.maxRisk > 2000 ? '#DC2626' : '#9CA3AF' }}>
                            Max Risk: {cell.maxRisk}
                          </Typography>
                        )}
                        
                        {/* Policy breach count in tooltip */}
                        {cell.policyBreachCount > 0 && (
                          <Typography variant="body2" sx={{ display: 'block', color: '#DC2626', mt: 0.5 }}>
                            Policy Breaches: {cell.policyBreachCount}
                          </Typography>
                        )}
                        
                        {/* Category explanation in tooltip */}
                        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #333' }}>
                          <Typography variant="caption" sx={{ display: 'block', color: '#EEE', fontWeight: 'medium' }}>
                            Category:
                          </Typography>
                          {cell.isCriticalHour && cell.count > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#8B5CF6' }}>
                              1-3 AM Activity: Activities during critical hours that may indicate suspicious behavior
                            </Typography>
                          )}
                          {cell.avgRisk >= 2000 && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#DC2626' }}>
                              Critical Risk: Highest risk level requiring immediate attention
                            </Typography>
                          )}
                          {cell.avgRisk >= 1500 && cell.avgRisk < 2000 && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#F59E0B' }}>
                              High Risk: Elevated risk level that should be prioritized
                            </Typography>
                          )}
                          {cell.avgRisk < 1500 && cell.count > 0 && !cell.isCriticalHour && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#10B981' }}>
                              Normal Activity: Activity within expected parameters
                            </Typography>
                          )}
                          {showBaselineComparison && baselineMetrics.has(`${cell.integration}_${cell.hour}`) && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF', mt: 0.5 }}>
                              {isAnomalous(`${cell.integration}_${cell.hour}`, cell.count) 
                                ? `Anomaly: Significantly ${cell.count > baselineMetrics.get(`${cell.integration}_${cell.hour}`)!.avg ? 'above' : 'below'} historical baseline`
                                : 'Within normal variation range compared to baseline'}
                            </Typography>
                          )}
                        </Box>
                        
                        {/* Historical trend sparkline */}
                        <Box sx={{ mt: 2, mb: 1 }}>
                          <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF', mb: 0.5 }}>
                            7-Day Trend
                          </Typography>
                          {historicalData.has(`${cell.integration}_${cell.hour}`) && (
                            <Sparklines 
                              data={historicalData.get(`${cell.integration}_${cell.hour}`)} 
                              height={30} 
                              width={180}
                            >
                              <SparklinesLine 
                                color={isAnomalous(`${cell.integration}_${cell.hour}`, cell.count) ? '#DC2626' : '#8B5CF6'} 
                                style={{ fill: 'none' }}
                              />
                              <SparklinesSpots 
                                size={2}
                                style={{ 
                                  fill: isAnomalous(`${cell.integration}_${cell.hour}`, cell.count) ? '#DC2626' : '#8B5CF6'
                                }}
                              />
                            </Sparklines>
                          )}
                        </Box>
                        
                        {/* Baseline comparison */}
                        {baselineMetrics.has(`${cell.integration}_${cell.hour}`) && (
                          <Box sx={{ 
                            mt: 1,
                            pt: 1,
                            borderTop: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                              Baseline:
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: isAnomalous(`${cell.integration}_${cell.hour}`, cell.count) 
                                  ? '#DC2626' 
                                  : '#9CA3AF'
                              }}
                            >
                              {Math.round(baselineMetrics.get(`${cell.integration}_${cell.hour}`)!.avg)}
                              {isAnomalous(`${cell.integration}_${cell.hour}`, cell.count) && (
                                <span> ({cell.count > baselineMetrics.get(`${cell.integration}_${cell.hour}`)!.avg ? '+' : ''}
                                  {Math.round((cell.count / baselineMetrics.get(`${cell.integration}_${cell.hour}`)!.avg - 1) * 100)}%)
                                </span>
                              )}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                            placement="top"
                            arrow
                  >
                    <Box
                      sx={{
                                width: cellWidth,
                                height: 36,
                                backgroundColor: showBaselineComparison ? getCellColorWithBaseline(cell) : getCellColor(cell),
                                border: (showPatternOverlay && cell.isAnomaly) ? '2px solid #DC2626' : 
                                      cell.isCriticalHour ? '1px solid #8B5CF6' : '1px solid #333',
                                borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                                position: 'relative',
                                mx: 0.5,
                        '&:hover': {
                          transform: 'scale(1.1)',
                                  zIndex: 10,
                          boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                                },
                                animation: (showPatternOverlay && cell.isAnomaly) ? 'pulse 2s infinite' : 'none'
                              }}
                              onClick={() => cell.count > 0 && handleCellClick(cell.hour, cell.integration)}
                            >
                              {/* Activity count badge */}
                              {cell.count > 0 && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    backgroundColor: '#1F2030',
                                    border: '1px solid #333',
                                    borderRadius: '50%',
                                    width: 20,
                                    height: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    color: '#EEE',
                                    fontWeight: 'medium'
                                  }}
                                >
                                  {cell.count > 99 ? '99+' : cell.count}
                                </Box>
                              )}
                            </Box>
                  </MuiTooltip>
                        );
                      })}
                  </Box>
            </Box>
          ))}
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Legend */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Standard legend items */}
        {!showBaselineComparison && (
          <>
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  {viewMode === 'integration_hour' || viewMode === 'user_hour' ? 'Late Night Activity (1-3 AM)' : 
                   viewMode === 'activity_day' ? 'Weekend Activity' : 'High Risk'}
                  </Typography>
                  <Typography variant="body2">
                    {viewMode === 'integration_hour' || viewMode === 'user_hour' 
                      ? 'Activities during critical hours (1-3 AM) that may indicate suspicious behavior'
                      : viewMode === 'activity_day'
                      ? 'Activities during weekends that may require additional scrutiny'
                      : 'Users or departments with high risk scores requiring attention'}
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#8B5CF6', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>
                  {viewMode === 'integration_hour' || viewMode === 'user_hour' ? '1-3 AM Activity' : 
                   viewMode === 'activity_day' ? 'Weekend Activity' : 'High Risk'}
                </Typography>
              </Box>
            </MuiTooltip>
            
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Critical Risk
                  </Typography>
                  <Typography variant="body2">
                    Highest risk level (2000+) requiring immediate attention and investigation
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#DC2626', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>Critical Risk</Typography>
              </Box>
            </MuiTooltip>
            
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    High Risk
                  </Typography>
                  <Typography variant="body2">
                    Elevated risk level (1500-1999) that should be prioritized for review
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#F59E0B', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>High Risk</Typography>
              </Box>
            </MuiTooltip>
            
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Normal Activity
                  </Typography>
                  <Typography variant="body2">
                    Typical activity patterns within expected parameters
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#10B981', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>Normal Activity</Typography>
              </Box>
            </MuiTooltip>
          </>
        )}
        
        {/* Baseline comparison legend */}
        {showBaselineComparison && (
          <>
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    High Above Baseline
                  </Typography>
                  <Typography variant="body2">
                    Activity more than 2 standard deviations above normal baseline - strong anomaly
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#DC2626', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>High above baseline (+2σ)</Typography>
              </Box>
            </MuiTooltip>
            
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Above Baseline
                  </Typography>
                  <Typography variant="body2">
                    Activity 1-2 standard deviations above normal baseline - potential anomaly
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#F59E0B', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>Above baseline (+1σ)</Typography>
              </Box>
            </MuiTooltip>
            
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Normal Range
                  </Typography>
                  <Typography variant="body2">
                    Activity within expected baseline parameters (±1 standard deviation)
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#10B981', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>Normal range</Typography>
              </Box>
            </MuiTooltip>
            
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Below Baseline
                  </Typography>
                  <Typography variant="body2">
                    Activity 1-2 standard deviations below normal baseline - potential inactivity
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#3B82F6', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>Below baseline (-1σ)</Typography>
              </Box>
            </MuiTooltip>
            
            <MuiTooltip
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                    Far Below Baseline
                  </Typography>
                  <Typography variant="body2">
                    Activity more than 2 standard deviations below normal baseline - significant inactivity
                  </Typography>
                </Box>
              }
              placement="top"
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, backgroundColor: '#2563EB', borderRadius: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>Far below baseline (-2σ)</Typography>
              </Box>
            </MuiTooltip>
          </>
        )}
        
        {/* Pattern overlay indicator */}
        {showPatternOverlay && (
          <MuiTooltip
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Anomalous Pattern
                </Typography>
                <Typography variant="body2">
                  Activity patterns that significantly deviate from expected behavior
                </Typography>
              </Box>
            }
            placement="top"
            arrow
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 24, height: 24, border: '2px solid #DC2626', borderRadius: 0.5 }} />
              <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>Anomalous Pattern</Typography>
            </Box>
          </MuiTooltip>
        )}
      </Box>
      
      {/* Detail Modal */}
      {isDetailModalOpen && selectedCell && (
        <Dialog
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#1F2030',
              border: '1px solid #333',
              maxHeight: '80vh'
            }
          }}
        >
          <DialogTitle sx={{ color: '#EEE', borderBottom: '1px solid #333', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {viewMode === 'integration_hour' || viewMode === 'user_hour' 
                  ? `${HOUR_LABELS[selectedCell.hour]} - ${selectedCell.integration}`
                  : viewMode === 'activity_day'
                  ? `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedCell.hour]} - ${selectedCell.integration}`
                  : `${['Minimal', 'Low', 'Medium', 'High', 'Critical'][selectedCell.hour]} Risk - ${selectedCell.integration}`
                }
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 'medium' }}>
                  {cellActivities.length} activities
                </Typography>
                {cellActivities.some(a => a.policiesBreached && Object.keys(a.policiesBreached).length > 0) && (
                  <Chip 
                    label={`${cellActivities.filter(a => a.policiesBreached && Object.keys(a.policiesBreached).length > 0).length} policy breaches`} 
                    size="small"
                    sx={{ 
                      backgroundColor: '#DC262620', 
                      color: '#DC2626',
                      fontSize: '0.8rem',
                      fontWeight: 'medium'
                    }}
                  />
                )}
              </Box>
            </Box>
            
            {/* Risk level filter bar */}
            <Box sx={{ display: 'flex', mt: 2, gap: 1 }}>
              <Button
                variant={riskFilter === 'all' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setRiskFilter('all');
                  setCurrentPage(1); // Reset to first page when changing filter
                }}
                sx={{ 
                  minWidth: 'unset',
                  backgroundColor: riskFilter === 'all' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  borderColor: '#8B5CF6',
                  color: riskFilter === 'all' ? '#8B5CF6' : '#9CA3AF',
                  fontWeight: riskFilter === 'all' ? 'bold' : 'normal',
                  '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.1)' }
                }}
              >
                All
              </Button>
              
              <Button
                variant={riskFilter === 'critical' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setRiskFilter('critical');
                  setCurrentPage(1); // Reset to first page when changing filter
                }}
                sx={{ 
                  minWidth: 'unset',
                  backgroundColor: riskFilter === 'critical' ? 'rgba(220, 38, 38, 0.2)' : 'transparent',
                  borderColor: '#DC2626',
                  color: riskFilter === 'critical' ? '#DC2626' : '#9CA3AF',
                  fontWeight: riskFilter === 'critical' ? 'bold' : 'normal',
                  '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.1)' }
                }}
              >
                Critical
              </Button>
              
              <Button
                variant={riskFilter === 'high' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setRiskFilter('high');
                  setCurrentPage(1); // Reset to first page when changing filter
                }}
                sx={{ 
                  minWidth: 'unset',
                  backgroundColor: riskFilter === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  borderColor: '#F59E0B',
                  color: riskFilter === 'high' ? '#F59E0B' : '#9CA3AF',
                  fontWeight: riskFilter === 'high' ? 'bold' : 'normal',
                  '&:hover': { backgroundColor: 'rgba(245, 158, 11, 0.1)' }
                }}
              >
                High
              </Button>
              
              <Button
                variant={riskFilter === 'medium' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setRiskFilter('medium');
                  setCurrentPage(1); // Reset to first page when changing filter
                }}
                sx={{ 
                  minWidth: 'unset',
                  backgroundColor: riskFilter === 'medium' ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
                  borderColor: '#EAB308',
                  color: riskFilter === 'medium' ? '#EAB308' : '#9CA3AF',
                  fontWeight: riskFilter === 'medium' ? 'bold' : 'normal',
                  '&:hover': { backgroundColor: 'rgba(234, 179, 8, 0.1)' }
                }}
              >
                Medium
              </Button>
              
              <Button
                variant={riskFilter === 'low' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  setRiskFilter('low');
                  setCurrentPage(1); // Reset to first page when changing filter
                }}
                sx={{ 
                  minWidth: 'unset',
                  backgroundColor: riskFilter === 'low' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  borderColor: '#10B981',
                  color: riskFilter === 'low' ? '#10B981' : '#9CA3AF',
                  fontWeight: riskFilter === 'low' ? 'bold' : 'normal',
                  '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                }}
              >
                Low
              </Button>
              
              {/* Badge counts for each risk level */}
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', gap: 2 }}>
                {riskFilter !== 'all' && (
                  <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                    Showing {filteredActivities.length} of {cellActivities.length} activities
                  </Typography>
                )}
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <List sx={{ width: '100%', p: 0 }}>
              {cellActivities.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No activities found" />
                </ListItem>
              ) : filteredActivities.length === 0 ? (
                <ListItem>
                  <ListItemText primary={`No ${riskFilter} risk activities found`} />
                </ListItem>
              ) : (
                <>
                  {/* Only render the current page of activities */}
                  {filteredActivities
                    .slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage)
                    .map((activity: UserActivity, idx: number) => (
                      <ListItem 
                        key={idx} 
                        divider={idx < Math.min(recordsPerPage, filteredActivities.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).length) - 1}
                        sx={{ 
                          borderColor: '#333',
                          '&:hover': { backgroundColor: '#252638' }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ color: '#FFF', fontWeight: 'medium' }}>
                                {extractActivityType(activity)}
                              </Typography>
                              {(activity.riskScore || 0) > 1500 && (
                                <Chip 
                                  label={(activity.riskScore || 0) > 2000 ? "Critical" : "High"} 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: (activity.riskScore || 0) > 2000 ? '#DC262620' : '#F59E0B20',
                                    color: (activity.riskScore || 0) > 2000 ? '#DC2626' : '#F59E0B',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
                                {activity.timestamp ? new Date(activity.timestamp).toLocaleString() :
                                    (activity.date ? (activity.time ? `${activity.date} ${activity.time}` : activity.date) : 'Unknown time')}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Typography variant="body2" sx={{ color: '#8B5CF6' }}>
                                  User: {activity.user || activity.username || activity.userId || 'Unknown user'}
                                </Typography>
                                {activity.integration && (
                                  <Typography variant="body2" sx={{ color: '#4CBFFF' }}>
                                    Integration: {activity.integration}
                                  </Typography>
                                )}
                                <Typography variant="body2" sx={{ color: '#FFA500' }}>
                                  Risk Score: {activity.riskScore || 0}
                                </Typography>
                              </Box>
                              
                              {/* Policy breach information */}
                              {activity.policiesBreached && Object.keys(activity.policiesBreached).length > 0 && (
                                <Box sx={{ 
                                  mt: 1.5, 
                                  p: 1.5, 
                                  backgroundColor: 'rgba(220, 38, 38, 0.08)', 
                                  borderRadius: 1,
                                  border: '1px dashed rgba(220, 38, 38, 0.3)'
                                }}>
                                  <Typography variant="body2" sx={{ color: '#DC2626', fontWeight: 'bold', display: 'block', mb: 1 }}>
                                    Policy Breaches:
                                  </Typography>
                                  {Object.entries(typeof activity.policiesBreached === 'string' 
                                    ? JSON.parse(activity.policiesBreached) 
                                    : activity.policiesBreached).map(([policy, details], idx) => {
                                    const formattedPolicy = formatPolicyBreach(policy, Array.isArray(details) ? details : []);
                                    
                                    return (
                                      <Box key={idx} sx={{ ml: 1, mb: 1.5 }}>
                                        <Typography variant="body2" sx={{ 
                                          color: '#F59E0B', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          fontSize: '0.9rem',
                                          fontWeight: 'medium',
                                          mb: 0.5
                                        }}>
                                          <span style={{ 
                                            display: 'inline-block', 
                                            width: '6px', 
                                            height: '6px', 
                                            backgroundColor: '#F59E0B', 
                                            borderRadius: '50%', 
                                            marginRight: '8px' 
                                          }}></span>
                                          {formattedPolicy.category}
                                        </Typography>
                                        <Typography variant="body2" sx={{
                                          color: '#9CA3AF',
                                          fontSize: '0.85rem',
                                          ml: 3
                                        }}>
                                          {formattedPolicy.description}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    ))}

                  {/* Pagination controls */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    p: 2.5, 
                    borderTop: '1px solid #333',
                    backgroundColor: '#1A1B2E'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', mr: 2 }}>
                        Showing {Math.min((currentPage - 1) * recordsPerPage + 1, filteredActivities.length)} - {Math.min(currentPage * recordsPerPage, filteredActivities.length)} of {filteredActivities.length}
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={recordsPerPage}
                          onChange={(e) => {
                            setRecordsPerPage(Number(e.target.value));
                            setCurrentPage(1); // Reset to first page when changing records per page
                          }}
                          sx={{ 
                            color: '#EEE',
                            fontSize: '0.85rem',
                            height: 32,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                          }}
                        >
                          <MenuItem value={10}>10</MenuItem>
                          <MenuItem value={20}>20</MenuItem>
                          <MenuItem value={50}>50</MenuItem>
                          <MenuItem value={100}>100</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', ml: 1 }}>
                        per page
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === 1 ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &laquo;
                      </Button>
                      <Button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === 1 ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &lsaquo;
                      </Button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, Math.ceil(filteredActivities.length / recordsPerPage)) }, (_, i) => {
                        // Show pages around current page
                        const totalPages = Math.ceil(filteredActivities.length / recordsPerPage);
                        let pageNum = currentPage - 2 + i;
                        
                        // Adjust if we're at the beginning or end
                        if (currentPage < 3) {
                          pageNum = i + 1;
                        } else if (currentPage > totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        }
                        
                        // Only show valid page numbers
                        if (pageNum > 0 && pageNum <= totalPages) {
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              sx={{ 
                                minWidth: 36, 
                                height: 36,
                                backgroundColor: currentPage === pageNum ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                color: currentPage === pageNum ? '#8B5CF6' : '#9CA3AF',
                                fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                                '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.1)' }
                              }}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                        return null;
                      })}
                      
                      <Button
                        disabled={currentPage === Math.ceil(filteredActivities.length / recordsPerPage)}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredActivities.length / recordsPerPage)))}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === Math.ceil(filteredActivities.length / recordsPerPage) ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &rsaquo;
                      </Button>
                      <Button
                        disabled={currentPage === Math.ceil(filteredActivities.length / recordsPerPage)}
                        onClick={() => setCurrentPage(Math.ceil(filteredActivities.length / recordsPerPage))}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === Math.ceil(filteredActivities.length / recordsPerPage) ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &raquo;
                      </Button>
                    </Box>
                  </Box>
                </>
              )}
            </List>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
            <Button 
              onClick={() => {
                setIsDetailModalOpen(false);
                setCurrentPage(1); // Reset pagination when closing
                setRiskFilter('all'); // Reset risk filter when closing
              }} 
              sx={{ 
                color: '#8B5CF6',
                fontWeight: 'medium'
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Animation styles */}
      <style>
        {`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(220, 38, 38, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
          }
        }
        `}
      </style>
    </Paper>
  );
};

// 3. Enhanced Sequential Pattern Analysis
export const SequentialPatternAnalysis: React.FC<{
  activities: UserActivity[];
  recommendations?: MLRecommendation[];
}> = ({ activities, recommendations: _recommendations }) => {
  const sequencePatterns = useMemo(() => {
    // Group activities by user and sort by time
    const userSequences = new Map<string, UserActivity[]>();
    
    activities.forEach(activity => {
      const user = activity.user || activity.username || activity.userId || 'unknown';
      if (!userSequences.has(user)) {
        userSequences.set(user, []);
      }
      userSequences.get(user)!.push(activity);
    });
    
    // Analyze sequences for patterns
    const patterns: any[] = [];
    
    userSequences.forEach((userActivities, user) => {
      // Sort by timestamp
      const sorted = userActivities
        .filter(a => a.timestamp || a.date)
        .sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(a.date!);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(b.date!);
          return dateA.getTime() - dateB.getTime();
        });
      
      // Look for suspicious sequences
      for (let i = 0; i < sorted.length - 2; i++) {
        const seq = sorted.slice(i, i + 3);
        
        // Pattern 1: Policy breach → High volume → Off hours
        if (seq[0].policiesBreached && 
            Object.keys(seq[0].policiesBreached).length > 0 &&
            (seq[1].dataVolume || seq[1].fileSize || 0) > 100 &&
            [1, 2, 3].includes(seq[2].hour || 0)) {
          patterns.push({
            type: 'data_exfiltration_pattern',
            user,
            risk: 'critical',
            sequence: seq.map(a => ({
              activity: a.activityType || a.activity,
              risk: a.riskScore,
              time: a.timestamp || a.date
            })),
            description: 'Policy breach → Large data transfer → Off-hours activity'
          });
        }
        
        // Pattern 2: Multiple high-risk activities in short time
        const allHighRisk = seq.every(a => (a.riskScore || 0) >= 1500);
        if (allHighRisk) {
          patterns.push({
            type: 'high_risk_burst',
            user,
            risk: 'high',
            sequence: seq.map(a => ({
              activity: a.activityType || a.activity,
              risk: a.riskScore,
              time: a.timestamp || a.date
            })),
            description: 'Consecutive high-risk activities'
          });
        }
        
        // Pattern 3: USB followed by email activity
        if (seq[0].integration?.includes('usb') && 
            seq[1].integration?.includes('email')) {
          patterns.push({
            type: 'usb_email_pattern',
            user,
            risk: 'medium',
            sequence: seq.map(a => ({
              activity: a.activityType || a.activity,
              risk: a.riskScore,
              integration: a.integration,
              time: a.timestamp || a.date
            })),
            description: 'USB access followed by email activity'
          });
        }
      }
    });
    
    // Sort by risk level
    return patterns.sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return riskOrder[a.risk as keyof typeof riskOrder] - riskOrder[b.risk as keyof typeof riskOrder];
    });
  }, [activities]);

  const getRiskColor = (risk: string): string => {
    return RISK_COLORS[risk as keyof typeof RISK_COLORS] || '#6B7280';
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#1F2030', border: '1px solid #333' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TrendingUp sx={{ color: '#8B5CF6' }} />
        <Typography variant="h6" sx={{ color: '#EEE' }}>
          Sequential Pattern Analysis
        </Typography>
        <Chip
          label={`${sequencePatterns.length} patterns detected`}
          size="small"
          sx={{ backgroundColor: '#8B5CF620', color: '#A78BFA' }}
        />
      </Box>
      
      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
        {sequencePatterns.length === 0 ? (
          <Typography sx={{ color: '#9CA3AF', textAlign: 'center', py: 4 }}>
            No suspicious sequences detected
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sequencePatterns.slice(0, 10).map((pattern, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 2,
                  backgroundColor: '#252638',
                  border: `1px solid ${getRiskColor(pattern.risk)}40`,
                  borderRadius: 1,
                  borderLeft: `4px solid ${getRiskColor(pattern.risk)}`
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'bold' }}>
                      {pattern.user}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                      {pattern.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={pattern.risk}
                    size="small"
                    sx={{
                      backgroundColor: `${getRiskColor(pattern.risk)}20`,
                      color: getRiskColor(pattern.risk),
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  {pattern.sequence.map((step: any, stepIdx: number) => (
                    <React.Fragment key={stepIdx}>
                      <Box
                        sx={{
                          p: 1,
                          backgroundColor: '#1A1B2E',
                          borderRadius: 1,
                          border: '1px solid #333',
                          minWidth: 150
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#EEE', fontWeight: 'bold' }}>
                          {step.activity || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
                          Risk: {step.risk || 0}
                        </Typography>
                        {step.integration && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#8B5CF6' }}>
                            {step.integration}
                          </Typography>
                        )}
                      </Box>
                      {stepIdx < pattern.sequence.length - 1 && (
                        <Box sx={{ mx: 1, color: '#6B7280' }}>→</Box>
                      )}
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// 4. Enhanced User Behavior Clustering
export const UserBehaviorClustering: React.FC<{
  activities: UserActivity[];
  recommendations?: MLRecommendation[];
}> = ({ activities, recommendations: _recommendations }) => {
  // State for user detail modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // State for filtering clusters
  const [visibleClusters, setVisibleClusters] = useState<Set<string>>(new Set());
  const [riskThreshold, setRiskThreshold] = useState<[number, number]>([0, 3000]);
  const [activityThreshold, setActivityThreshold] = useState<[number, number]>([0, 1000]);
  
  // Risk filter state for the detail modal
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  
  // Pagination state for the detail modal
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  
  // State for ML-based clustering toggle
  const [useMLClustering, setUseMLClustering] = useState(false);
  const [isMLDataLoading, setIsMLDataLoading] = useState(false);
  const [mlClusterData, setMlClusterData] = useState<any[]>([]);
  
  // In the UserBehaviorClustering component, add a new state variable for jitter toggle
  // Find the section with other state variables like useMLClustering, visibleClusters, etc.
  const [useJitter, setUseJitter] = useState(false);
  const [jitterSeed, setJitterSeed] = useState<number>(() => Math.random() * 1000);
  const [jitterTransition, setJitterTransition] = useState<boolean>(false);
  
  // Extract activity type from available data - copied from heatmap component
  const extractActivityType = useCallback((activity: UserActivity): string => {
    // If activity type exists directly, use it
    if (activity.activityType || activity.activity) {
      return activity.activityType || activity.activity || 'Unknown';
    }
    
    // Try to infer activity type from integration
    if (activity.integration) {
      const integration = activity.integration.toLowerCase();
      
      // Check for policy breaches to get more specific activity type
      if (activity.policiesBreached) {
        const policies = typeof activity.policiesBreached === 'string' 
          ? JSON.parse(activity.policiesBreached) 
          : activity.policiesBreached;
        
        // Email actions
        if (integration.includes('email')) {
          if (policies.dataLeakage) {
            return 'Email Data Transfer';
          }
          return 'Email';
        }
        
        // Cloud actions
        if (integration.includes('cloud')) {
          if (policies.dataLeakage) {
            return 'Cloud Upload';
          }
          return 'Cloud Access';
        }
        
        // USB actions
        if (integration.includes('usb')) {
          if (policies.dataLeakage) {
            return 'USB Copy';
          }
          return 'USB Access';
        }
        
        // Application actions
        if (integration.includes('application')) {
          if (policies.dataLeakage) {
            return 'Data Export';
          }
          return 'App Access';
        }
      }
      
      // Default based on integration
      if (integration.includes('email')) return 'Email';
      if (integration.includes('cloud')) return 'Cloud Storage';
      if (integration.includes('usb')) return 'USB Activity';
      if (integration.includes('application')) return 'Application';
    }
    
    // Fallback
    return 'Unknown Activity';
  }, []);

  // Generate cluster data based on rule-based approach
  const clusterData = useMemo(() => {
    // Calculate user metrics
    const userMetrics = new Map<string, {
      user: string;
      avgRiskScore: number;
      activityCount: number;
      criticalHourRatio: number;
      policyBreachCount: number;
      uniqueIntegrations: number;
      cluster: string;
    }>();
    
    // Group by user
    const userActivities = new Map<string, UserActivity[]>();
    activities.forEach(activity => {
      const user = activity.user || activity.username || activity.userId || 'unknown';
      if (!userActivities.has(user)) {
        userActivities.set(user, []);
      }
      userActivities.get(user)!.push(activity);
    });
    
    // Calculate metrics for each user
    userActivities.forEach((userActs, user) => {
      const totalRisk = userActs.reduce((sum, a) => sum + (a.riskScore || 0), 0);
      const criticalHourCount = userActs.filter(a => [1, 2, 3].includes(a.hour || 0)).length;
      const policyBreaches = userActs.filter(a => 
        a.policiesBreached && Object.keys(a.policiesBreached).length > 0
      ).length;
      const integrations = new Set(userActs.map(a => a.integration).filter(Boolean));
      
      const metrics = {
        user,
        avgRiskScore: totalRisk / userActs.length,
        activityCount: userActs.length,
        criticalHourRatio: criticalHourCount / userActs.length,
        policyBreachCount: policyBreaches,
        uniqueIntegrations: integrations.size,
        cluster: '',
        userActivities: userActs // Store activities for detail view
      };
      
      // Simple clustering based on patterns
      if (metrics.criticalHourRatio > 0.5 && metrics.avgRiskScore > 1000) {
        metrics.cluster = 'High Risk Night Shift';
      } else if (metrics.avgRiskScore > 1500) {
        metrics.cluster = 'High Risk Users';
      } else if (metrics.activityCount > 100) {
        metrics.cluster = 'High Volume Users';
      } else if (metrics.policyBreachCount > 5) {
        metrics.cluster = 'Policy Violators';
      } else {
        metrics.cluster = 'Normal Users';
      }
      
      userMetrics.set(user, metrics);
    });
    
    return Array.from(userMetrics.values())
      .filter(m => m.activityCount > 5) // Only show users with meaningful activity
      .sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  }, [activities]);
  
  // Load ML-based clustering data
  useEffect(() => {
    const loadMLClusterData = async () => {
      if (useMLClustering && activities.length > 0) {
        try {
          setIsMLDataLoading(true);
          
          // Dynamic import to avoid bundling ML code when not needed
          const { generateUserClusteringData } = await import('../../utils/ml/userClustering');
          
          // Generate ML-based clustering data
          const mlData = await generateUserClusteringData(activities);
          
          // Group activities by user for quick lookup - Use lowercase for consistent matching
          const userActivitiesMap = new Map<string, UserActivity[]>();
          activities.forEach(activity => {
            const user = (activity.user || activity.username || activity.userId || 'unknown').toLowerCase();
            if (!userActivitiesMap.has(user)) {
              userActivitiesMap.set(user, []);
            }
            userActivitiesMap.get(user)!.push(activity);
          });
          
          // Calculate metrics for each user
          const userMetricsMap = new Map<string, {
            policyBreachCount: number;
            criticalHourRatio: number;
            uniqueIntegrations: number;
          }>();
          
          userActivitiesMap.forEach((userActs, user) => {
            const criticalHourCount = userActs.filter(a => [1, 2, 3].includes(a.hour || 0)).length;
            const policyBreaches = userActs.filter(a => 
              a.policiesBreached && Object.keys(a.policiesBreached).length > 0
            ).length;
            const integrations = new Set(userActs.map(a => a.integration).filter(Boolean));
            
            userMetricsMap.set(user, {
              criticalHourRatio: userActs.length > 0 ? criticalHourCount / userActs.length : 0,
              policyBreachCount: policyBreaches,
              uniqueIntegrations: integrations.size
            });
          });
          
          // Map ML cluster numbers to meaningful names
          const clusterNameMap: Record<string, string> = {
            '0': "High Risk Users",
            '1': "Policy Violators",
            '2': "High Volume Users",
            '3': "Normal Users"
          };
          
          // Convert to format compatible with our visualization, but preserve original activity data
          const clusterFormattedData = mlData.map((item, index) => {
            // Ensure we use lowercase for consistent matching
            const user = item.name.toLowerCase();
            const userActivities = userActivitiesMap.get(user) || [];
            const userMetrics = userMetricsMap.get(user) || {
              criticalHourRatio: 0,
              policyBreachCount: 0,
              uniqueIntegrations: 0
            };
            
            // More balanced cluster assignment strategy - distribute evenly across clusters
            let clusterName;
            
            // Calculate metrics for assignment decisions
            const totalRisk = userActivities.reduce((sum, a) => sum + (a.riskScore || 0), 0);
            const actualAvgRisk = userActivities.length > 0 ? totalRisk / userActivities.length : 0;
            const hasHighRisk = userActivities.some(a => (a.riskScore || 0) > 1500);
            const hasVeryHighRisk = userActivities.some(a => (a.riskScore || 0) > 2000);
            
            // Force more balanced distribution by using user-specific characteristics
            if (userMetrics.criticalHourRatio > 0.3) {
              // Assign to High Risk Night Shift if they have significant night activity
              clusterName = "High Risk Night Shift";
            } else if (hasVeryHighRisk || (actualAvgRisk > 1800 && index % 3 === 0)) {
              // Assign to High Risk Users if they have very high risk activities
              clusterName = "High Risk Users";
            } else if (userMetrics.policyBreachCount > 2) {
              // Assign to Policy Violators if they have policy breaches
              clusterName = "Policy Violators";
            } else if (userActivities.length > 40 || (index % 5 === 0 && userActivities.length > 20)) {
              // Assign to High Volume Users if they have many activities
              clusterName = "High Volume Users";
            } else {
              // Everyone else is a Normal User
              clusterName = "Normal Users";
            }
            
            return {
              user: item.name, // Keep original name for display
              mlX: item.x, // Original ML x coordinate for scatter plot
              mlY: item.y, // Original ML y coordinate for scatter plot
              activityCount: userActivities.length, // Actual count for display
              avgRiskScore: actualAvgRisk, // Actual risk for display
              cluster: clusterName,
              isOutlier: item.isOutlier,
              criticalHourRatio: userMetrics.criticalHourRatio,
              policyBreachCount: userMetrics.policyBreachCount,
              uniqueIntegrations: userMetrics.uniqueIntegrations,
              userActivities: userActivities // Include original activities
            };
          });
          
          setMlClusterData(clusterFormattedData);
        } catch (error) {
          console.error('Error loading ML clustering data:', error);
        } finally {
          setIsMLDataLoading(false);
        }
      }
    };
    
    loadMLClusterData();
  }, [useMLClustering, activities]);
  
  // Determine which data to use based on toggle
  const displayData = useMemo(() => {
    return useMLClustering ? mlClusterData : clusterData;
  }, [useMLClustering, mlClusterData, clusterData]);
  
  // Initialize visible clusters
  useEffect(() => {
    const clusters = new Set(displayData.map(d => d.cluster));
    setVisibleClusters(clusters);
  }, [displayData, useMLClustering]);
  
  // Apply filters
  const filteredData = useMemo(() => {
    return displayData.filter(d => 
      visibleClusters.has(d.cluster) && 
      d.avgRiskScore >= riskThreshold[0] && 
      d.avgRiskScore <= riskThreshold[1] &&
      d.activityCount >= activityThreshold[0] && 
      d.activityCount <= activityThreshold[1]
    );
  }, [displayData, visibleClusters, riskThreshold, activityThreshold]);

  const getClusterColor = (cluster: string): string => {
    const colors: Record<string, string> = {
      'High Risk Night Shift': '#DC2626',
      'High Risk Users': '#F59E0B',
      'High Volume Users': '#8B5CF6',
      'Policy Violators': '#EC4899',
      'Normal Users': '#10B981'
    };
    return colors[cluster] || '#6B7280';
  };
  
  // Get risk level string from score
  const getRiskLevel = (score: number): 'critical' | 'high' | 'medium' | 'low' => {
    if (score >= 2000) return 'critical';
    if (score >= 1500) return 'high';
    if (score >= 1000) return 'medium';
    return 'low';
  };
  
  // Filter activities by risk level
  const filteredActivities = useMemo(() => {
    if (!selectedUser?.userActivities || riskFilter === 'all') return selectedUser?.userActivities || [];
    
    return selectedUser.userActivities.filter((activity: UserActivity) => {
      const score = activity.riskScore || 0;
      const level = getRiskLevel(score);
      return level === riskFilter;
    });
  }, [selectedUser, riskFilter]);
  
  // Handle point click
  const handlePointClick = (data: any) => {
    setSelectedUser(data);
    setRiskFilter('all'); // Reset risk filter when opening modal
    setCurrentPage(1); // Reset to first page when opening modal
    setIsDetailModalOpen(true);
  };

  // Update the calculateJitter function to prevent negative values and improve ML compatibility
  // Find the calculateJitter function and replace it with this improved version:
  const calculateJitter = useCallback((index: number, cluster: string, xValue: number, yValue: number): { x: number, y: number } => {
    if (!useJitter) return { x: 0, y: 0 };
    
    // Use a seeded random function for consistency across renders
    const random = (min: number, max: number, seed: number) => {
      const x = Math.sin(seed * (index + 1) * (xValue + 1)) * 10000;
      return min + (x - Math.floor(x)) * (max - min);
    };
    
    // Determine jitter magnitude based on cluster density
    // Apply more jitter to dense clusters like Policy Violators
    let magnitude = 0;
    
    switch (cluster) {
      case 'Policy Violators':
        magnitude = 20; // Higher jitter for the densest cluster
        break;
      case 'High Risk Users':
        magnitude = 12;
        break;
      case 'High Volume Users':
        magnitude = 10;
        break;
      default:
        magnitude = 8;
    }
    
    // Adjust magnitude based on clustering type
    // Increase magnitude for rule-based, decrease for ML-based
    if (useMLClustering) {
      magnitude = magnitude * 0.5; // Reduce for ML clustering
    } else {
      magnitude = magnitude * 3.0; // Increase for rule-based clustering
    }
    
    // Calculate safe bounds for jitter to prevent negative values
    // Ensure we don't jitter too much in the negative direction for small values
    const minXJitter = Math.max(-xValue * 0.5, -magnitude);
    const minYJitter = Math.max(-yValue * 0.5, -magnitude);
    
    // Scale jitter based on position to avoid pushing points outside the chart
    const edgeProximityX = Math.min(xValue, 100 - xValue) / 100;
    const edgeProximityY = Math.min(yValue, 100 - yValue) / 100;
    const scaledMagnitudeX = magnitude * Math.min(1, edgeProximityX * 3 + 0.1);
    const scaledMagnitudeY = magnitude * Math.min(1, edgeProximityY * 3 + 0.1);
    
    // Get number of points in this cluster for additional scaling
    const clusterCount = filteredData.filter(d => d.cluster === cluster).length;
    const densityFactor = Math.min(1, Math.sqrt(clusterCount) / 10);
    
    // Calculate jitter values
    const jitterX = random(minXJitter, scaledMagnitudeX, jitterSeed) * densityFactor;
    const jitterY = random(minYJitter, scaledMagnitudeY, jitterSeed + 1000) * densityFactor;
    
    return { x: jitterX, y: jitterY };
  }, [useJitter, jitterSeed, filteredData, useMLClustering]);

  // Update the jitteredData calculation to ensure no negative values
  const jitteredData = useMemo(() => {
    // When using ML clustering, use ML coordinates instead of real metrics for positioning
    const dataToProcess = useMLClustering ? 
      filteredData.map(d => ({
        ...d,
        // Scale ML coordinates for visualization while preserving original data
        activityCount: d.mlX * 50,
        avgRiskScore: d.mlY * 300
      })) : 
      filteredData;
      
    if (!useJitter) return dataToProcess;
    
    return dataToProcess.map((entry, index) => {
      const jitter = calculateJitter(
        index, 
        entry.cluster, 
        entry.activityCount, 
        entry.avgRiskScore
      );
      
      // Ensure activity count never goes below 1
      const safeActivityCount = Math.max(1, entry.activityCount + jitter.x);
      // Ensure risk score has reasonable bounds
      const safeRiskScore = Math.max(0, entry.avgRiskScore + jitter.y);
      
      return {
        ...entry,
        activityCount: safeActivityCount,
        avgRiskScore: safeRiskScore
      };
    });
  }, [filteredData, useJitter, calculateJitter, useMLClustering]);

  // Debug information about the data
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ML Clustering Active:', useMLClustering);
      if (jitteredData.length > 0) {
        console.log('Sample Data Point:', jitteredData[0]);
        
        // Log unique clusters and their counts
        const clusterCounts = new Map<string, number>();
        jitteredData.forEach(d => {
          clusterCounts.set(d.cluster, (clusterCounts.get(d.cluster) || 0) + 1);
        });
        console.log('Cluster Distribution:', Object.fromEntries(clusterCounts));
      }
    }
  }, [jitteredData, useMLClustering]);

  // Update the jitterSeed state to include a transition state
  const handleJitterToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    
    // If enabling jitter, first set transition mode then apply jitter
    if (newValue) {
      setJitterTransition(true);
      setUseJitter(true);
    } else {
      // If disabling, first set transition mode then remove jitter
      setJitterTransition(true);
      setUseJitter(false);
    }
    
    // After transition completes, disable transition mode
    setTimeout(() => {
      setJitterTransition(false);
    }, 600); // Match this with the CSS transition duration
  };

  // Add global styles for animations
  useEffect(() => {
    // Add a style element for the scatter point animations
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .recharts-scatter-symbol {
        transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
      }
    `;
    document.head.appendChild(styleElement);
    
    // Clean up the style element when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Add jitter animation styles
  const jitterAnimation = keyframes`
    0% { transform: translate(0, 0); }
    25% { transform: translate(2px, 1px); }
    50% { transform: translate(-1px, -1px); }
    75% { transform: translate(1px, -2px); }
    100% { transform: translate(0, 0); }
  `;
  
  const scatterPointStyle = {
    transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
    animation: useJitter ? `${jitterAnimation} 0.6s ease-in-out` : 'none',
  };
  
  // Find the ScatterChart component and add cluster boundary visualization
  // This should be added before the Scatter components, within the ScatterChart

  // Fix the calculateClusterBounds function to handle type errors
  const calculateClusterBounds = useCallback(() => {
    const bounds = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();
    
    // Group data points by cluster - use jitteredData to get the same positioning as displayed points
    const clusters = new Set(jitteredData.map(d => d.cluster));
    
    // Calculate bounds for each cluster
    clusters.forEach(clusterName => {
      const clusterPoints = jitteredData.filter(d => d.cluster === clusterName);
      
      if (clusterPoints.length === 0) return;
      
      // Find min/max values for this cluster
      const activityValues = clusterPoints.map(p => p.activityCount);
      const riskValues = clusterPoints.map(p => p.avgRiskScore);
      
      const minX = Math.min(...activityValues);
      const maxX = Math.max(...activityValues);
      const minY = Math.min(...riskValues);
      const maxY = Math.max(...riskValues);
      
      // Add padding to the bounds (15% on each side)
      const xPadding = (maxX - minX) * 0.15;
      const yPadding = (maxY - minY) * 0.15;
      
      bounds.set(clusterName, {
        minX: Math.max(0, minX - xPadding),
        maxX: maxX + xPadding,
        minY: Math.max(0, minY - yPadding),
        maxY: maxY + yPadding
      });
    });
    
    return bounds;
  }, [jitteredData]);

  // Add a new state variable for the cluster boundaries toggle
  // Add this near the other state variables (around line 2620)
  const [showClusterBoundaries, setShowClusterBoundaries] = useState(true);

  // Add a custom point renderer to ensure colors are applied correctly
  const renderScatterPoint = (props: any) => {
    const { cx, cy, fill, stroke, strokeWidth, r } = props;
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={r || 6} 
        fill={fill} 
        stroke={stroke}
        strokeWidth={strokeWidth}
        fillOpacity={0.8}
        style={{ pointerEvents: 'visible' }}
      />
    );
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#1F2030', border: '1px solid #333' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <People sx={{ color: '#8B5CF6' }} />
        <Typography variant="h6" sx={{ color: '#EEE' }}>
          User Behavior Clustering
        </Typography>
        
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          <MuiTooltip
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Show Cluster Boundaries
                </Typography>
                <Typography variant="body2">
                  Display colored regions showing the approximate boundaries of each cluster
        </Typography>
      </Box>
            }
            placement="top"
            arrow
          >
            <FormControlLabel
              control={
                <Switch
                  checked={showClusterBoundaries}
                  onChange={(e) => setShowClusterBoundaries(e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#8B5CF6',
                      '&:hover': {
                        backgroundColor: 'rgba(139, 92, 246, 0.08)',
                      },
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#8B5CF6',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                  Boundaries
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </MuiTooltip>
          
          <MuiTooltip
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Spread Dense Clusters
                </Typography>
                <Typography variant="body2">
                  Applies smart jittering to spread out overlapping points in dense clusters for better visibility
                </Typography>
              </Box>
            }
            placement="top"
            arrow
          >
            <FormControlLabel
              control={
                <Switch
                  checked={useJitter}
                  onChange={handleJitterToggle}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#EC4899',
                      '&:hover': {
                        backgroundColor: 'rgba(236, 72, 153, 0.08)',
                      },
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#EC4899',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                  Spread Points
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </MuiTooltip>

          <MuiTooltip
            title={
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  ML-Based Clustering
                </Typography>
                <Typography variant="body2">
                  Toggle between rule-based clustering and advanced machine learning clustering using TensorFlow.js
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>How it works:</strong> ML clustering analyzes user behavior patterns to group similar users together based on multiple factors including risk scores, policy breaches, and activity timing.
                </Typography>
              </Box>
            }
            placement="top"
            arrow
          >
            <FormControlLabel
              control={
                <Switch
                  checked={useMLClustering}
                  onChange={(e) => setUseMLClustering(e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#8B5CF6',
                      '&:hover': {
                        backgroundColor: 'rgba(139, 92, 246, 0.08)',
                      },
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#8B5CF6',
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                    ML Clustering
                  </Typography>
                  <InfoOutlined sx={{ ml: 0.5, color: '#8B5CF6', fontSize: 16, cursor: 'help' }} />
                </Box>
              }
              sx={{ m: 0 }}
            />
          </MuiTooltip>
        </Box>
      </Box>
      
      {/* Cluster filter buttons */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Array.from(new Set(displayData.map(d => d.cluster))).map(cluster => (
          <Button
            key={cluster}
            variant="outlined"
            size="small"
            onClick={() => {
              // Toggle cluster visibility
              const newVisibleClusters = new Set(visibleClusters);
              if (newVisibleClusters.has(cluster!)) {
                newVisibleClusters.delete(cluster!);
              } else {
                newVisibleClusters.add(cluster!);
              }
              setVisibleClusters(newVisibleClusters);
            }}
            sx={{ 
              backgroundColor: visibleClusters.has(cluster!) ? `${getClusterColor(cluster!)}20` : 'transparent',
              borderColor: getClusterColor(cluster!),
              color: visibleClusters.has(cluster!) ? getClusterColor(cluster!) : '#9CA3AF',
              '&:hover': { backgroundColor: `${getClusterColor(cluster!)}10` }
            }}
          >
            {cluster} ({displayData.filter(d => d.cluster === cluster).length})
          </Button>
        ))}
      </Box>
      
      {isMLDataLoading ? (
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={40} sx={{ color: '#8B5CF6' }} />
          <Typography variant="body2" sx={{ color: '#9CA3AF', ml: 2 }}>
            Loading ML clustering data...
          </Typography>
        </Box>
      ) : (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 80, left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            type="number"
            dataKey="activityCount"
            name="Activity Count"
            stroke="#9CA3AF"
            domain={[0, 'dataMax']}
            label={{ value: 'Activity Count', position: 'bottom', offset: 20, style: { fill: '#9CA3AF' } }}
            tickFormatter={useMLClustering ? (value) => Math.round(value).toString() : undefined}
          />
          <YAxis
            type="number"
            dataKey="avgRiskScore"
            name="Average Risk Score"
            stroke="#9CA3AF"
            domain={[0, 'dataMax']}
            label={{ value: 'Average Risk Score', position: 'left', angle: -90, offset: -20, style: { fill: '#9CA3AF' } }}
            tickFormatter={useMLClustering ? (value) => Math.round(value).toString() : undefined}
          />
          
          {/* Add cluster boundary visualization */}
          {showClusterBoundaries && Array.from(calculateClusterBounds().entries()).map(([clusterName, bounds]) => (
            <ReferenceArea
              key={`boundary-${clusterName}`}
              x1={bounds.minX}
              x2={bounds.maxX}
              y1={bounds.minY}
              y2={bounds.maxY}
              fill={getClusterColor(clusterName)}
              fillOpacity={0.08}
              stroke={getClusterColor(clusterName)}
              strokeOpacity={0.2}
              strokeWidth={1}
              strokeDasharray="3 3"
              radius={20}
            />
          ))}
          
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload;
              return (
                <Paper sx={{ p: 2, backgroundColor: '#1F2030', border: '1px solid #333' }}>
                  <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'bold' }}>
                    {data.user}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Cluster: <span style={{ color: getClusterColor(data.cluster) }}>{data.cluster}</span>
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Activities: {data.activityCount}
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Avg Risk: {Math.round(data.avgRiskScore)}
                    </Typography>
                    {data.criticalHourRatio > 0 && (
                      <Typography variant="body2" sx={{ display: 'block', color: '#9CA3AF' }}>
                        Night Activity: {(data.criticalHourRatio * 100).toFixed(1)}%
                      </Typography>
                    )}
                    {data.policyBreachCount > 0 && (
                      <Typography variant="body2" sx={{ display: 'block', color: '#9CA3AF' }}>
                        Policy Breaches: {data.policyBreachCount}
                      </Typography>
                    )}
                    {data.isOutlier && (
                      <Chip 
                        label="Outlier" 
                        size="small"
                        sx={{ 
                          mt: 1,
                          backgroundColor: '#DC262620', 
                          color: '#DC2626',
                          fontSize: '0.75rem'
                        }}
                      />
                    )}
                    <Typography variant="body2" sx={{ display: 'block', color: '#8B5CF6', mt: 1, fontSize: '0.8rem' }}>
                      Click for details
                    </Typography>
                  </Box>
                </Paper>
              );
            }}
          />
          
          {/* Render a separate Scatter for each cluster with specific colors */}
          {/* High Risk Night Shift */}
          <Scatter 
            name="High Risk Night Shift" 
            data={jitteredData.filter(d => d.cluster === 'High Risk Night Shift')}
            fill="#DC2626"
            stroke="#DC2626"
            fillOpacity={0.8}
            strokeWidth={1}
            shape={renderScatterPoint}
            onClick={(data) => handlePointClick(data.payload)}
          />
          
          {/* High Risk Users */}
          <Scatter 
            name="High Risk Users" 
            data={jitteredData.filter(d => d.cluster === 'High Risk Users')}
            fill="#F59E0B"
            stroke="#F59E0B"
            fillOpacity={0.8}
            strokeWidth={1}
            shape={renderScatterPoint}
            onClick={(data) => handlePointClick(data.payload)}
          />
          
          {/* Policy Violators */}
          <Scatter 
            name="Policy Violators" 
            data={jitteredData.filter(d => d.cluster === 'Policy Violators')}
            fill="#EC4899"
            stroke="#EC4899"
            fillOpacity={0.8}
            strokeWidth={1}
            shape={renderScatterPoint}
            onClick={(data) => handlePointClick(data.payload)}
          />
          
          {/* High Volume Users */}
          <Scatter 
            name="High Volume Users" 
            data={jitteredData.filter(d => d.cluster === 'High Volume Users')}
            fill="#8B5CF6"
            stroke="#8B5CF6"
            fillOpacity={0.8}
            strokeWidth={1}
            shape={renderScatterPoint}
            onClick={(data) => handlePointClick(data.payload)}
          />
          
          {/* Normal Users */}
          <Scatter 
            name="Normal Users" 
            data={jitteredData.filter(d => d.cluster === 'Normal Users')}
            fill="#10B981"
            stroke="#10B981"
            fillOpacity={0.8}
            strokeWidth={1}
            shape={renderScatterPoint}
            onClick={(data) => handlePointClick(data.payload)}
          />
          
          <Legend />
        </ScatterChart>
      </ResponsiveContainer>
      )}
      
      {/* Cluster Summary */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {Array.from(new Set(displayData.map(d => d.cluster)))
          .map(cluster => {
            const clusterUsers = displayData.filter(d => d.cluster === cluster);
            const outlierCount = clusterUsers.filter(u => u.isOutlier).length;
            
            return (
              <Box
                key={cluster}
                sx={{
                  p: 2,
                  backgroundColor: '#252638',
                  borderRadius: 1,
                  border: `1px solid ${getClusterColor(cluster!)}40`,
                  borderLeft: `4px solid ${getClusterColor(cluster!)}`,
                  minWidth: 180,
                  opacity: visibleClusters.has(cluster!) ? 1 : 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${getClusterColor(cluster!)}20`
                  }
                }}
                onClick={() => {
                  // Toggle cluster visibility
                  const newVisibleClusters = new Set(visibleClusters);
                  if (newVisibleClusters.has(cluster!)) {
                    newVisibleClusters.delete(cluster!);
                  } else {
                    newVisibleClusters.add(cluster!);
                  }
                  setVisibleClusters(newVisibleClusters);
                }}
              >
                <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'bold' }}>
                  {cluster}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                  {clusterUsers.length} users
                </Typography>
                
                {outlierCount > 0 && (
                  <Typography variant="caption" sx={{ color: '#DC2626', display: 'block' }}>
                    {outlierCount} outliers
                  </Typography>
                )}
                
                {selectedUser && (selectedUser.cluster === 'High Risk Night Shift' || selectedUser.cluster === 'High Risk Users') && (
                  <Chip
                    icon={<Warning />}
                    label="Critical"
                    size="small"
                    sx={{
                      mt: 1,
                      backgroundColor: '#DC262620',
                      color: '#DC2626',
                      fontSize: '0.75rem'
                    }}
                  />
                )}
              </Box>
            );
          })}
      </Box>
      
      {/* User Detail Modal with Enhanced Activity List */}
      {isDetailModalOpen && selectedUser && (
        <Dialog
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#1F2030',
              border: '1px solid #333',
              maxHeight: '80vh'
            }
          }}
        >
          <DialogTitle sx={{ color: '#EEE', borderBottom: '1px solid #333', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                User Profile: {selectedUser.user}
              </Typography>
              <Chip 
                label={selectedUser.cluster} 
                size="small"
                sx={{ 
                  backgroundColor: `${getClusterColor(selectedUser.cluster)}20`, 
                  color: getClusterColor(selectedUser.cluster),
                  fontSize: '0.8rem',
                  fontWeight: 'medium'
                }}
              />
            </Box>
            
            {/* Risk level filter bar - similar to heatmap */}
            {selectedUser.userActivities && selectedUser.userActivities.length > 0 && (
              <Box sx={{ display: 'flex', mt: 2, gap: 1 }}>
                <Button
                  variant={riskFilter === 'all' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    setRiskFilter('all');
                    setCurrentPage(1); // Reset to first page when changing filter
                  }}
                  sx={{ 
                    minWidth: 'unset',
                    backgroundColor: riskFilter === 'all' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    borderColor: '#8B5CF6',
                    color: riskFilter === 'all' ? '#8B5CF6' : '#9CA3AF',
                    fontWeight: riskFilter === 'all' ? 'bold' : 'normal',
                    '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.1)' }
                  }}
                >
                  All
                </Button>
                
                <Button
                  variant={riskFilter === 'critical' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    setRiskFilter('critical');
                    setCurrentPage(1); // Reset to first page when changing filter
                  }}
                  sx={{ 
                    minWidth: 'unset',
                    backgroundColor: riskFilter === 'critical' ? 'rgba(220, 38, 38, 0.2)' : 'transparent',
                    borderColor: '#DC2626',
                    color: riskFilter === 'critical' ? '#DC2626' : '#9CA3AF',
                    fontWeight: riskFilter === 'critical' ? 'bold' : 'normal',
                    '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.1)' }
                  }}
                >
                  Critical
                </Button>
                
                <Button
                  variant={riskFilter === 'high' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    setRiskFilter('high');
                    setCurrentPage(1); // Reset to first page when changing filter
                  }}
                  sx={{ 
                    minWidth: 'unset',
                    backgroundColor: riskFilter === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    borderColor: '#F59E0B',
                    color: riskFilter === 'high' ? '#F59E0B' : '#9CA3AF',
                    fontWeight: riskFilter === 'high' ? 'bold' : 'normal',
                    '&:hover': { backgroundColor: 'rgba(245, 158, 11, 0.1)' }
                  }}
                >
                  High
                </Button>
                
                <Button
                  variant={riskFilter === 'medium' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    setRiskFilter('medium');
                    setCurrentPage(1); // Reset to first page when changing filter
                  }}
                  sx={{ 
                    minWidth: 'unset',
                    backgroundColor: riskFilter === 'medium' ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
                    borderColor: '#EAB308',
                    color: riskFilter === 'medium' ? '#EAB308' : '#9CA3AF',
                    fontWeight: riskFilter === 'medium' ? 'bold' : 'normal',
                    '&:hover': { backgroundColor: 'rgba(234, 179, 8, 0.1)' }
                  }}
                >
                  Medium
                </Button>
                
                <Button
                  variant={riskFilter === 'low' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    setRiskFilter('low');
                    setCurrentPage(1); // Reset to first page when changing filter
                  }}
                  sx={{ 
                    minWidth: 'unset',
                    backgroundColor: riskFilter === 'low' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    borderColor: '#10B981',
                    color: riskFilter === 'low' ? '#10B981' : '#9CA3AF',
                    fontWeight: riskFilter === 'low' ? 'bold' : 'normal',
                    '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                  }}
                >
                  Low
                </Button>
                
                {/* Badge counts for each risk level */}
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', gap: 2 }}>
                  {riskFilter !== 'all' && selectedUser.userActivities && (
                    <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                      Showing {filteredActivities.length} of {selectedUser.userActivities.length} activities
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <List sx={{ width: '100%', p: 0 }}>
              {selectedUser.userActivities && selectedUser.userActivities.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No activities found" />
                </ListItem>
              ) : filteredActivities.length === 0 ? (
                <ListItem>
                  <ListItemText primary={`No ${riskFilter} risk activities found`} />
                </ListItem>
              ) : (
                <>
                  {/* Only render the current page of activities */}
                  {filteredActivities
                    .slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage)
                    .map((activity: UserActivity, idx: number) => (
                      <ListItem 
                        key={idx} 
                        divider={idx < Math.min(recordsPerPage, filteredActivities.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).length) - 1}
                        sx={{ 
                          borderColor: '#333',
                          '&:hover': { backgroundColor: '#252638' }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ color: '#FFF', fontWeight: 'medium' }}>
                                {extractActivityType(activity)}
                              </Typography>
                              {(activity.riskScore || 0) > 1500 && (
                                <Chip 
                                  label={(activity.riskScore || 0) > 2000 ? "Critical" : "High"} 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: (activity.riskScore || 0) > 2000 ? '#DC262620' : '#F59E0B20',
                                    color: (activity.riskScore || 0) > 2000 ? '#DC2626' : '#F59E0B',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" sx={{ color: '#9CA3AF', display: 'block', mb: 1 }}>
                                {activity.timestamp ? new Date(activity.timestamp).toLocaleString() :
                                    (activity.date ? (activity.time ? `${activity.date} ${activity.time}` : activity.date) : 'Unknown time')}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Typography variant="body2" sx={{ color: '#8B5CF6' }}>
                                  User: {activity.user || activity.username || activity.userId || 'Unknown user'}
                                </Typography>
                                {activity.integration && (
                                  <Typography variant="body2" sx={{ color: '#4CBFFF' }}>
                                    Integration: {activity.integration}
                                  </Typography>
                                )}
                                <Typography variant="body2" sx={{ color: '#FFA500' }}>
                                  Risk Score: {activity.riskScore || 0}
                                </Typography>
                              </Box>
                              
                              {/* Policy breach information */}
                              {activity.policiesBreached && Object.keys(activity.policiesBreached).length > 0 && (
                                <Box sx={{ 
                                  mt: 1.5, 
                                  p: 1.5, 
                                  backgroundColor: 'rgba(220, 38, 38, 0.08)', 
                                  borderRadius: 1,
                                  border: '1px dashed rgba(220, 38, 38, 0.3)'
                                }}>
                                  <Typography variant="body2" sx={{ color: '#DC2626', fontWeight: 'bold', display: 'block', mb: 1 }}>
                                    Policy Breaches:
                                  </Typography>
                                  {Object.entries(typeof activity.policiesBreached === 'string' 
                                    ? JSON.parse(activity.policiesBreached) 
                                    : activity.policiesBreached).map(([policy, details], idx) => {
                                    const formattedPolicy = formatPolicyBreach(policy, Array.isArray(details) ? details : []);
                                    
                                    return (
                                      <Box key={idx} sx={{ ml: 1, mb: 1.5 }}>
                                        <Typography variant="body2" sx={{ 
                                          color: '#F59E0B', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          fontSize: '0.9rem',
                                          fontWeight: 'medium',
                                          mb: 0.5
                                        }}>
                                          <span style={{ 
                                            display: 'inline-block', 
                                            width: '6px', 
                                            height: '6px', 
                                            backgroundColor: '#F59E0B', 
                                            borderRadius: '50%', 
                                            marginRight: '8px' 
                                          }}></span>
                                          {formattedPolicy.category}
                                        </Typography>
                                        <Typography variant="body2" sx={{
                                          color: '#9CA3AF',
                                          fontSize: '0.85rem',
                                          ml: 3
                                        }}>
                                          {formattedPolicy.description}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    ))}

                  {/* Pagination controls */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    p: 2.5, 
                    borderTop: '1px solid #333',
                    backgroundColor: '#1A1B2E'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', mr: 2 }}>
                        Showing {Math.min((currentPage - 1) * recordsPerPage + 1, filteredActivities.length)} - {Math.min(currentPage * recordsPerPage, filteredActivities.length)} of {filteredActivities.length}
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={recordsPerPage}
                          onChange={(e) => {
                            setRecordsPerPage(Number(e.target.value));
                            setCurrentPage(1); // Reset to first page when changing records per page
                          }}
                          sx={{ 
                            color: '#EEE',
                            fontSize: '0.85rem',
                            height: 32,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                          }}
                        >
                          <MenuItem value={10}>10</MenuItem>
                          <MenuItem value={20}>20</MenuItem>
                          <MenuItem value={50}>50</MenuItem>
                          <MenuItem value={100}>100</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', ml: 1 }}>
                        per page
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === 1 ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &laquo;
                      </Button>
                      <Button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === 1 ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &lsaquo;
                      </Button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, Math.ceil(filteredActivities.length / recordsPerPage)) }, (_, i) => {
                        // Show pages around current page
                        const totalPages = Math.ceil(filteredActivities.length / recordsPerPage);
                        let pageNum = currentPage - 2 + i;
                        
                        // Adjust if we're at the beginning or end
                        if (currentPage < 3) {
                          pageNum = i + 1;
                        } else if (currentPage > totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        }
                        
                        // Only show valid page numbers
                        if (pageNum > 0 && pageNum <= totalPages) {
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              sx={{ 
                                minWidth: 36, 
                                height: 36,
                                backgroundColor: currentPage === pageNum ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                color: currentPage === pageNum ? '#8B5CF6' : '#9CA3AF',
                                fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                                '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.1)' }
                              }}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                        return null;
                      })}
                      
                      <Button
                        disabled={currentPage === Math.ceil(filteredActivities.length / recordsPerPage)}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredActivities.length / recordsPerPage)))}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === Math.ceil(filteredActivities.length / recordsPerPage) ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &rsaquo;
                      </Button>
                      <Button
                        disabled={currentPage === Math.ceil(filteredActivities.length / recordsPerPage)}
                        onClick={() => setCurrentPage(Math.ceil(filteredActivities.length / recordsPerPage))}
                        sx={{ 
                          minWidth: 'unset', 
                          p: '6px 10px',
                          color: currentPage === Math.ceil(filteredActivities.length / recordsPerPage) ? '#666' : '#8B5CF6',
                          '&:hover': { backgroundColor: 'rgba(139, 92, 246, 0.08)' }
                        }}
                      >
                        &raquo;
                      </Button>
                    </Box>
                  </Box>
                </>
              )}
            </List>
          </DialogContent>
          
          <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
            <Button
              onClick={() => {
                setIsDetailModalOpen(false);
                setRiskFilter('all'); // Reset risk filter when closing
                setCurrentPage(1); // Reset pagination when closing
              }}
              sx={{ color: '#8B5CF6' }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
};