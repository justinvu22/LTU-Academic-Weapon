import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { UserActivity, UserActivityStats } from '../types/UserActivityType';

interface AdvancedChartsProps {
  activities: UserActivity[];
  stats: UserActivityStats;
}

// Color palettes
const RISK_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336']; // success, info, warning, error
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];
const BREACH_COLORS = {
  dataLeakage: '#f44336',
  pii: '#ff9800',
  phi: '#e91e63',
  pci: '#9c27b0',
  financial: '#673ab7',
  sensitive: '#3f51b5',
  userAtRisk: '#2196f3',
  fraud: '#009688',
};

export const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ activities, stats }) => {
  const [timeFilter, setTimeFilter] = useState('30');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  // Prepare the pie chart data for risk scores
  const riskScoreData = [
    { name: 'Low Risk', value: stats.riskScoreDistribution.low },
    { name: 'Medium Risk', value: stats.riskScoreDistribution.medium },
    { name: 'High Risk', value: stats.riskScoreDistribution.high },
    { name: 'Critical Risk', value: stats.riskScoreDistribution.critical },
  ];

  // Process activity timeline data
  useEffect(() => {
    // Create a map of dates to risk counts
    const dateMap = new Map();
    const daysToInclude = parseInt(timeFilter);
    
    // Prepare all dates in the range
    const today = new Date();
    for (let i = 0; i < daysToInclude; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { date: dateStr, low: 0, medium: 0, high: 0, critical: 0, total: 0 });
    }
    
    // Fill in actual data from activities
    activities.forEach(activity => {
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const parts = activity.date.split('/');
      if (parts.length !== 3) return;
      
      const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      if (!dateMap.has(dateStr)) return;
      
      const entry = dateMap.get(dateStr);
      entry.total++;
      
      if (activity.riskScore < 1000) entry.low++;
      else if (activity.riskScore < 1500) entry.medium++;
      else if (activity.riskScore < 2000) entry.high++;
      else entry.critical++;
    });
    
    // Convert map to array and sort by date
    const timelineArray = Array.from(dateMap.values());
    timelineArray.sort((a, b) => a.date.localeCompare(b.date));
    
    setTimelineData(timelineArray);
    
    // Process heatmap data - Top users by day of week
    const userActivityMap = new Map();
    
    activities.forEach(activity => {
      const user = activity.user;
      if (!userActivityMap.has(user)) {
        userActivityMap.set(user, {
          user,
          total: 0,
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0,
          avgRiskScore: 0,
          totalRiskScore: 0,
        });
      }
      
      const userRecord = userActivityMap.get(user);
      userRecord.total++;
      userRecord.totalRiskScore += activity.riskScore;
      
      // Convert DD/MM/YYYY to day of week
      const parts = activity.date.split('/');
      if (parts.length !== 3) return;
      
      const dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      switch(dayOfWeek) {
        case 0: userRecord.sunday++; break;
        case 1: userRecord.monday++; break;
        case 2: userRecord.tuesday++; break;
        case 3: userRecord.wednesday++; break;
        case 4: userRecord.thursday++; break;
        case 5: userRecord.friday++; break;
        case 6: userRecord.saturday++; break;
      }
    });
    
    // Calculate average risk score
    userActivityMap.forEach(record => {
      record.avgRiskScore = record.totalRiskScore / record.total;
    });
    
    // Convert to array and sort by total activities
    const userArray = Array.from(userActivityMap.values());
    userArray.sort((a, b) => b.total - a.total);
    
    // Take top 10 users
    setHeatmapData(userArray.slice(0, 10));
    setSelectedUsers(userArray.slice(0, 5).map(u => u.user)); // Default select top 5
    
  }, [activities, timeFilter]);

  // Process policy breach distribution data
  const breachData = Object.entries(stats.breachCategories).map(([category, count]) => ({
    name: category,
    value: count,
    color: BREACH_COLORS[category as keyof typeof BREACH_COLORS] || '#999',
  }));

  // Create status breakdown data for bar chart
  const statusData = [
    { name: 'Under Review', value: stats.statusBreakdown.underReview },
    { name: 'Trusted', value: stats.statusBreakdown.trusted },
    { name: 'Concern', value: stats.statusBreakdown.concern },
    { name: 'Non-Concern', value: stats.statusBreakdown.nonConcern },
  ];

  // Helper to format date strings
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Filter timeline data for selected users
  const filteredLineData = timelineData.filter(entry => 
    selectedUsers.length === 0 || selectedUsers.includes(entry.user)
  );

  return (
    <Grid container spacing={3}>
      {/* Risk Score Distribution Pie Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Risk Score Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskScoreData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => 
                    percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                >
                  {riskScoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Activities']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Policy Breach Distribution Pie Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Policy Breach Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={breachData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => 
                    percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                >
                  {breachData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Breaches']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Activity Timeline Line Chart */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Activity Timeline
              </Typography>
              <FormControl sx={{ minWidth: 120 }} size="small">
                <InputLabel id="time-filter-label">Time Range</InputLabel>
                <Select
                  labelId="time-filter-label"
                  id="time-filter"
                  value={timeFilter}
                  label="Time Range"
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <MenuItem value="7">Last 7 Days</MenuItem>
                  <MenuItem value="14">Last 14 Days</MenuItem>
                  <MenuItem value="30">Last 30 Days</MenuItem>
                  <MenuItem value="90">Last 90 Days</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={timelineData}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="critical" stroke="#f44336" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="high" stroke="#ff9800" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="medium" stroke="#2196f3" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="low" stroke="#4caf50" strokeWidth={2} dot={{ r: 1 }} />
                <Line type="monotone" dataKey="total" stroke="#9e9e9e" strokeWidth={3} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* User Activity by Day of Week Heatmap */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Activity by Day of Week
            </Typography>
            <Box sx={{ overflow: 'auto' }}>
              <Box sx={{ minWidth: 700, height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={heatmapData}
                    margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="user" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="monday" name="Monday" stackId="a" fill="#e57373" />
                    <Bar dataKey="tuesday" name="Tuesday" stackId="a" fill="#81c784" />
                    <Bar dataKey="wednesday" name="Wednesday" stackId="a" fill="#64b5f6" />
                    <Bar dataKey="thursday" name="Thursday" stackId="a" fill="#ffd54f" />
                    <Bar dataKey="friday" name="Friday" stackId="a" fill="#9575cd" />
                    <Bar dataKey="saturday" name="Saturday" stackId="a" fill="#4db6ac" />
                    <Bar dataKey="sunday" name="Sunday" stackId="a" fill="#f06292" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Status Distribution Bar Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={statusData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Integration Type Bar Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Integration Types
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: 'Email', value: stats.integrationBreakdown.email },
                  { name: 'Cloud', value: stats.integrationBreakdown.cloud },
                  { name: 'USB', value: stats.integrationBreakdown.usb },
                  { name: 'Application', value: stats.integrationBreakdown.application },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}; 