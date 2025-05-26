import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Box, 
  Paper, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent 
} from '@mui/material';
import { UserActivity } from '../types/activity';

interface AdvancedChartsProps {
  activities: UserActivity[];
}

// Chart color constants
const COLORS = {
  primary: '#8884d8',
  secondary: '#82ca9d',
  tertiary: '#ffc658',
  quaternary: '#ff8042',
  risk: {
    low: '#4caf50',
    medium: '#2196f3',
    high: '#ff9800',
    critical: '#f44336',
  },
  breach: {
    dataLeakage: '#f44336',
    pii: '#ff9800',
    phi: '#e91e63',
    pci: '#9c27b0',
    financial: '#673ab7',
    sensitive: '#3f51b5',
    userAtRisk: '#2196f3', 
    fraud: '#009688',
  }
};

// Format date for display
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

/**
 * Component to display advanced analytics charts for user activities
 */
export const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ activities }) => {
  const [timeRange, setTimeRange] = useState('30');
  const [riskTrend, setRiskTrend] = useState<any[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [breachTrend, setBreachTrend] = useState<any[]>([]);
  
  // Calculate risk score trends over time
  const calculateRiskTrend = useCallback(() => {
    const days = parseInt(timeRange);
    const dateMap = new Map();
    
    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dateMap.set(dateStr, { 
        date: formatDate(dateStr), 
        avgRiskScore: 0,
        totalScore: 0,
        count: 0
      });
    }
    
    // Process activities
    activities.forEach(activity => {
      // Get date from timestamp or date property
      let dateStr = '';
      
      if (activity.timestamp) {
        dateStr = activity.timestamp.split('T')[0];
      } else if (activity.date) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parts = activity.date.split('/');
        if (parts.length === 3) {
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      if (dateMap.has(dateStr)) {
        const entry = dateMap.get(dateStr);
        entry.totalScore += activity.riskScore ?? 0;
        entry.count++;
      }
    });
    
    // Calculate averages and prepare final data
    const result = Array.from(dateMap.values());
    
    result.forEach(entry => {
      if (entry.count > 0) {
        entry.avgRiskScore = Math.round(entry.totalScore / entry.count);
      }
    });
    
    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date));
    
    setRiskTrend(result);
  }, [activities, timeRange]);
  
  // Calculate top users by activity count
  const calculateUserActivity = useCallback(() => {
    const userMap = new Map();
    
    activities.forEach(activity => {
      const user = activity.username || activity.userId || 'Unknown';
      
      if (!userMap.has(user)) {
        userMap.set(user, {
          user,
          activities: 0,
          highRisk: 0,
          avgRiskScore: 0,
          totalScore: 0
        });
      }
      
      const entry = userMap.get(user);
      entry.activities++;
      if (activity.riskScore !== undefined && activity.riskScore >= 70) {
        entry.highRisk++;
      }
      entry.totalScore += activity.riskScore ?? 0;
    });
    
    // Calculate averages
    userMap.forEach(entry => {
      entry.avgRiskScore = Math.round(entry.totalScore / entry.activities);
    });
    
    // Convert to array and sort by activity count
    const result = Array.from(userMap.values());
    result.sort((a, b) => b.activities - a.activities);
    
    // Take top 10 users
    setUserActivity(result.slice(0, 10));
  }, [activities]);
  
  // Calculate breach trends over time
  const calculateBreachTrend = useCallback(() => {
    const days = parseInt(timeRange);
    const dateMap = new Map();
    
    // Initialize dates
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dateMap.set(dateStr, { 
        date: formatDate(dateStr),
        total: 0,
        dataLeakage: 0,
        pii: 0, 
        sensitive: 0,
        other: 0
      });
    }
    
    // Process activities
    activities.forEach(activity => {
      // Get date from timestamp or date property
      let dateStr = '';
      
      if (activity.timestamp) {
        dateStr = activity.timestamp.split('T')[0];
      } else if (activity.date) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parts = activity.date.split('/');
        if (parts.length === 3) {
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      if (!dateMap.has(dateStr)) return;
      
      const entry = dateMap.get(dateStr);
      
      // Count policy breaches
      if (!activity.policiesBreached) return;
      const breaches = activity.policiesBreached;
      
      Object.keys(breaches).forEach(category => {
        const count = Array.isArray(breaches[category]) ? breaches[category].length : (breaches[category] ? 1 : 0);
        
        if (count === 0) return;
        
        entry.total += count;
        
        // Categorize common breach types
        if (category === 'dataLeakage') {
          entry.dataLeakage += count;
        } else if (category === 'pii') {
          entry.pii += count;
        } else if (category === 'sensitive') {
          entry.sensitive += count;
        } else {
          entry.other += count;
        }
      });
    });
    
    // Convert to array and sort by date
    const result = Array.from(dateMap.values());
    result.sort((a, b) => a.date.localeCompare(b.date));
    
    setBreachTrend(result);
  }, [activities, timeRange]);
  
  // Calculate data when activities or time range changes
  useEffect(() => {
    calculateRiskTrend();
    calculateUserActivity();
    calculateBreachTrend();
  }, [calculateRiskTrend, calculateUserActivity, calculateBreachTrend]);
  
  // Handle time range change
  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Time Range Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
          >
            <MenuItem value="7">Last 7 Days</MenuItem>
            <MenuItem value="14">Last 14 Days</MenuItem>
            <MenuItem value="30">Last 30 Days</MenuItem>
            <MenuItem value="90">Last 90 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Risk Score Trend */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom align="center">
          Average Risk Score Trend
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={riskTrend}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${value}`, 'Risk Score']} />
            <Line 
              type="monotone" 
              dataKey="avgRiskScore" 
              name="Average Risk Score" 
              stroke={COLORS.primary} 
              activeDot={{ r: 8 }} 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
      
      {/* Top Users */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom align="center">
          Top Users by Activity
        </Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={userActivity}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="user" width={100} />
            <Tooltip formatter={(value) => [`${value}`, 'Count']} />
            <Bar 
              dataKey="activities" 
              name="Total Activities" 
              fill={COLORS.primary}
            />
            <Bar 
              dataKey="highRisk" 
              name="High Risk Activities" 
              fill={COLORS.risk.high}
            />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
      
      {/* Policy Breach Trend */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom align="center">
          Policy Breach Trend
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={breachTrend}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value}`, 'Breaches']} />
            <Area 
              type="monotone" 
              dataKey="dataLeakage" 
              name="Data Leakage" 
              stackId="1"
              fill={COLORS.breach.dataLeakage} 
              stroke={COLORS.breach.dataLeakage}
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="pii" 
              name="PII" 
              stackId="1"
              fill={COLORS.breach.pii} 
              stroke={COLORS.breach.pii}
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="sensitive" 
              name="Sensitive" 
              stackId="1"
              fill={COLORS.breach.sensitive} 
              stroke={COLORS.breach.sensitive}
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="other" 
              name="Other" 
              stackId="1"
              fill={COLORS.tertiary} 
              stroke={COLORS.tertiary}
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}; 