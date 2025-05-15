import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { Box, Paper, Typography, List, ListItem, ListItemText, Divider, ListItemIcon } from '@mui/material';
import { UserActivity } from '../types/activity';
import { policyIcons } from '../constants/policyIcons';

interface ActivityChartsProps {
  activities: UserActivity[];
}

/**
 * Component to display overview charts for user activities
 */
export const ActivityCharts: React.FC<ActivityChartsProps> = ({ activities }) => {
  // Calculate risk score distribution
  const riskScoreDistribution = {
    low: activities.filter(a => a.riskScore < 40).length,
    medium: activities.filter(a => a.riskScore >= 40 && a.riskScore < 70).length,
    high: activities.filter(a => a.riskScore >= 70 && a.riskScore < 90).length,
    critical: activities.filter(a => a.riskScore >= 90).length,
  };

  // Calculate integration breakdown
  const integrations = activities.reduce((acc: Record<string, number>, activity) => {
    const integration = activity.integration;
    acc[integration] = (acc[integration] || 0) + 1;
    return acc;
  }, {});

  // Prepare data for charts
  const riskScoreData = [
    { name: 'Low Risk', value: riskScoreDistribution.low, color: '#4caf50' },
    { name: 'Medium Risk', value: riskScoreDistribution.medium, color: '#2196f3' },
    { name: 'High Risk', value: riskScoreDistribution.high, color: '#ff9800' },
    { name: 'Critical Risk', value: riskScoreDistribution.critical, color: '#f44336' },
  ];

  const integrationData = Object.entries(integrations).map(([name, value], index) => ({
    name,
    value,
    color: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'][index % 6]
  }));

  // Calculate breach categories
  const breachCategories: Record<string, number> = {};
  activities.forEach(activity => {
    if (activity.policiesBreached) {
      Object.keys(activity.policiesBreached).forEach(category => {
        const breaches = activity.policiesBreached[category];
        if (Array.isArray(breaches)) {
          breaches.forEach(breach => {
            breachCategories[breach] = (breachCategories[breach] || 0) + 1;
          });
        } else if (breaches) {
          breachCategories[category] = (breachCategories[category] || 0) + 1;
        }
      });
    }
  });

  // Top 5 Policy Breaches
  const top5Breaches = Object.entries(breachCategories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Calculate activity over time (last 30 days)
  const timeData = calculateActivityOverTime(activities, 30);
  
  // Calculate severity trends (based on risk scores)
  const severityTrend = calculateSeverityTrend(activities);
  
  // Calculate "fixed vulnerabilities" - show as count by date
  const fixedVulnerabilities = calculateFixedVulnerabilities(activities);
  
  // Calculate average time to fix/resolve issues - by category
  const timeToFix = calculateTimeToFix(activities);
  
  // Calculate users needing attention (high risk activities)
  const usersNeedingAttention = calculateUsersNeedingAttention(activities);

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
        {/* RISK TREND */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">RISK TREND</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={timeData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} Activities`, 'Count']} />
              <Legend />
              <Line type="monotone" dataKey="count" name="Activities" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="risk" name="Risk Score" stroke="#ff9800" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        {/* SEVERITY TREND */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">SEVERITY TREND</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={severityTrend}
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
        </Paper>

        {/* FIXED VULNERABILITIES */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">POLICY BREACHES</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={fixedVulnerabilities}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} Breaches`, 'Count']} />
              <Legend />
              <Bar dataKey="count" name="Breach Count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* AVERAGE TIME TO FIX */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">ACTIVITY BY INTEGRATION</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={integrationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => 
                  percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
              >
                {integrationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} Activities`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>

        {/* TARGETS NEEDING ATTENTION */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">USERS NEEDING ATTENTION</Typography>
          </Box>
          {usersNeedingAttention.length > 0 ? (
            <List>
              {usersNeedingAttention.map((user, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText 
                      primary={user.username} 
                      secondary={`${user.highRisk} high risk activities`} 
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Box sx={{ 
                        bgcolor: '#eee', 
                        px: 1, 
                        borderRadius: 1, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: user.criticalCount > 0 ? '#f44336' : '#9e9e9e'
                      }}>
                        C: {user.criticalCount}
                      </Box>
                      <Box sx={{ 
                        bgcolor: '#eee', 
                        px: 1, 
                        borderRadius: 1, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: user.highCount > 0 ? '#ff9800' : '#9e9e9e'
                      }}>
                        H: {user.highCount}
                      </Box>
                      <Box sx={{ 
                        bgcolor: '#eee', 
                        px: 1, 
                        borderRadius: 1, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: user.mediumCount > 0 ? '#2196f3' : '#9e9e9e'
                      }}>
                        M: {user.mediumCount}
                      </Box>
                    </Box>
                  </ListItem>
                  {index < usersNeedingAttention.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body1" align="center" sx={{ p: 5 }}>
              No users have high risk activities
            </Typography>
          )}
        </Paper>

        {/* TOP 5 VULNERABILITIES */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">TOP 5 POLICY BREACHES</Typography>
          </Box>
          {top5Breaches.length > 0 ? (
            <List>
              {top5Breaches.map((breach, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    {policyIcons[breach.name] && (
                      <ListItemIcon>
                        {policyIcons[breach.name]}
                      </ListItemIcon>
                    )}
                    <ListItemText 
                      primary={breach.name} 
                      secondary={`${breach.value} occurrences`} 
                    />
                  </ListItem>
                  {index < top5Breaches.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body1" align="center" sx={{ p: 5 }}>
              No policy breaches detected
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

/**
 * Calculate activity data over time
 */
function calculateActivityOverTime(activities: UserActivity[], days: number) {
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
        timeData[i].risk += activity.riskScore;
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

/**
 * Calculate severity trend over time
 */
function calculateSeverityTrend(activities: UserActivity[]) {
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
        const riskScore = activity.riskScore;
        
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

/**
 * Calculate policy breach categories
 */
function calculateFixedVulnerabilities(activities: UserActivity[]) {
  // Count breaches by category
  const breachCounts: Record<string, number> = {};
  
  activities.forEach(activity => {
    if (activity.policiesBreached) {
      Object.keys(activity.policiesBreached).forEach(category => {
        if (!breachCounts[category]) {
          breachCounts[category] = 0;
        }
        
        const breaches = activity.policiesBreached[category];
        if (Array.isArray(breaches)) {
          breachCounts[category] += breaches.length;
        } else if (breaches) {
          breachCounts[category] += 1;
        }
      });
    }
  });
  
  // Convert to array format for chart
  return Object.entries(breachCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 categories
}

/**
 * Calculate time to fix by category (just a dummy calculation for demo)
 */
function calculateTimeToFix(activities: UserActivity[]) {
  // In a real application, this would calculate actual resolution times
  // For demo, we'll just use the risk score as a proxy for "time to fix"
  const categories = ['dataLeakage', 'pii', 'phi', 'pci', 'financial', 'sensitive'];
  
  const result = categories.map(category => {
    let totalScore = 0;
    let count = 0;
    
    activities.forEach(activity => {
      if (activity.policiesBreached && activity.policiesBreached[category]) {
        count++;
        totalScore += activity.riskScore;
      }
    });
    
    return {
      category,
      avgTime: count > 0 ? Math.round(totalScore / count) : 0
    };
  });
  
  return result.filter(item => item.avgTime > 0);
}

/**
 * Calculate users needing attention based on high risk activities
 */
function calculateUsersNeedingAttention(activities: UserActivity[]) {
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
    const riskScore = activity.riskScore;
    
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