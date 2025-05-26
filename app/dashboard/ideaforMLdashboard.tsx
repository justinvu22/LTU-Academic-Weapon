// components/MLDashboardComponents.tsx
"use client";

import React, { useMemo, useState } from 'react';
import {
  Line, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, Bar, ComposedChart
} from 'recharts';
import { Box, Paper, Typography, Chip, Select, MenuItem, FormControl, Tooltip as MuiTooltip } from '@mui/material';
import { Warning, TrendingUp, Security, People } from '@mui/icons-material';
import { UserActivity, MLRecommendation } from '../../types/activity';

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
        <Typography variant="caption" sx={{ color: '#EEE', fontWeight: 'bold' }}>
          {data.timestamp}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            Total Activities: {data.totalActivities}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#F59E0B' }}>
            Anomalies: {data.anomalies} ({data.anomalyRate.toFixed(1)}%)
          </Typography>
        </Box>
        {data.criticalAnomalies > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: '#DC2626' }}>
              Critical: {data.criticalAnomalies}
            </Typography>
          </Box>
        )}
        {data.criticalHourActivity > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: '#8B5CF6' }}>
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
  const heatmapData = useMemo(() => {
    // Create hour x integration matrix
    const matrix = new Map<string, Map<number, { count: number; totalRisk: number; maxRisk: number }>>();
    
    // Get unique integrations
    const integrations = new Set<string>();
    
    activities.forEach(activity => {
      const integration = activity.integration || 'unknown';
      integrations.add(integration);
      
      const hour = activity.hour ?? 
                   (activity.timestamp ? new Date(activity.timestamp).getHours() : null);
      
      if (hour === null) return;
      
      if (!matrix.has(integration)) {
        matrix.set(integration, new Map());
      }
      
      const hourMap = matrix.get(integration)!;
      const current = hourMap.get(hour) || { count: 0, totalRisk: 0, maxRisk: 0 };
      
      current.count++;
      current.totalRisk += activity.riskScore || 0;
      current.maxRisk = Math.max(current.maxRisk, activity.riskScore || 0);
      
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
          isUSB: integration.toLowerCase().includes('usb')
        });
      }
    });
    
    return {
      cells: heatmapCells,
      integrations: Array.from(integrations),
      maxCount: Math.max(...heatmapCells.map(c => c.count))
    };
  }, [activities]);

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

  return (
    <Paper sx={{ p: 3, backgroundColor: '#1F2030', border: '1px solid #333' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Security sx={{ color: '#8B5CF6' }} />
        <Typography variant="h6" sx={{ color: '#EEE' }}>
          Risk Pattern Heatmap
        </Typography>
      </Box>
      
      {/* Heatmap Grid */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 800, position: 'relative' }}>
          {/* Hour labels */}
          <Box sx={{ display: 'flex', ml: 15, mb: 1 }}>
            {HOUR_LABELS.map((label, i) => (
              <Box
                key={i}
                sx={{
                  width: 30,
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: [1, 2, 3].includes(i) ? '#8B5CF6' : '#9CA3AF',
                  fontWeight: [1, 2, 3].includes(i) ? 'bold' : 'normal'
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
          
          {/* Integration rows */}
          {heatmapData.integrations.map((integration, _yIndex) => (
            <Box key={integration} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  width: 140,
                  color: integration.includes('usb') ? '#F59E0B' : '#9CA3AF',
                  fontWeight: integration.includes('usb') ? 'bold' : 'normal',
                  textAlign: 'right',
                  pr: 2,
                  fontSize: '0.8rem'
                }}
              >
                {integration}
              </Typography>
              
              {/* Heat cells */}
              {heatmapData.cells
                .filter(c => c.integration === integration)
                .sort((a, b) => a.hour - b.hour)
                .map((cell, i) => (
                  <MuiTooltip
                    key={i}
                    title={
                      <Box>
                        <Typography variant="caption">{cell.hourLabel}</Typography>
                        <br />
                        <Typography variant="caption">Activities: {cell.count}</Typography>
                        <br />
                        <Typography variant="caption">Avg Risk: {Math.round(cell.avgRisk)}</Typography>
                        {cell.maxRisk > 2000 && (
                          <>
                            <br />
                            <Typography variant="caption" sx={{ color: '#DC2626' }}>
                              Max Risk: {cell.maxRisk}
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        backgroundColor: getCellColor(cell),
                        border: cell.isCriticalHour ? '1px solid #8B5CF6' : '1px solid #333',
                        borderRadius: 0.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          zIndex: 1,
                          boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                        }
                      }}
                    />
                  </MuiTooltip>
                ))}
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Legend */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#8B5CF6', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>1-3 AM Activity</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#DC2626', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>Critical Risk</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#F59E0B', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>High Risk</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#10B981', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>Normal Activity</Typography>
        </Box>
      </Box>
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
        cluster: ''
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

  return (
    <Paper sx={{ p: 3, backgroundColor: '#1F2030', border: '1px solid #333' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <People sx={{ color: '#8B5CF6' }} />
        <Typography variant="h6" sx={{ color: '#EEE' }}>
          User Behavior Clustering
        </Typography>
      </Box>
      
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            type="number"
            dataKey="activityCount"
            name="Activity Count"
            stroke="#9CA3AF"
            label={{ value: 'Activity Count', position: 'insideBottom', offset: -10, style: { fill: '#9CA3AF' } }}
          />
          <YAxis
            type="number"
            dataKey="avgRiskScore"
            name="Average Risk Score"
            stroke="#9CA3AF"
            label={{ value: 'Average Risk Score', position: 'insideLeft', angle: -90, style: { fill: '#9CA3AF' } }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload;
              return (
                <Paper sx={{ p: 2, backgroundColor: '#1F2030', border: '1px solid #333' }}>
                  <Typography variant="caption" sx={{ color: '#EEE', fontWeight: 'bold' }}>
                    {data.user}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Cluster: {data.cluster}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Activities: {data.activityCount}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Avg Risk: {Math.round(data.avgRiskScore)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Night Activity: {(data.criticalHourRatio * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>
                      Policy Breaches: {data.policyBreachCount}
                    </Typography>
                  </Box>
                </Paper>
              );
            }}
          />
          
          {/* Render different clusters */}
          {Array.from(new Set(clusterData.map(d => d.cluster))).map(cluster => (
            <Scatter
              key={cluster}
              name={cluster}
              data={clusterData.filter(d => d.cluster === cluster)}
              fill={getClusterColor(cluster!)}
            >
              {clusterData
                .filter(d => d.cluster === cluster)
                .map((_entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getClusterColor(cluster!)}
                    fillOpacity={0.8}
                  />
                ))}
            </Scatter>
          ))}
          
          <Legend />
        </ScatterChart>
      </ResponsiveContainer>
      
      {/* Cluster Summary */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {Array.from(new Set(clusterData.map(d => d.cluster)))
          .map(cluster => {
            const clusterUsers = clusterData.filter(d => d.cluster === cluster);
            return (
              <Box
                key={cluster}
                sx={{
                  p: 2,
                  backgroundColor: '#252638',
                  borderRadius: 1,
                  border: `1px solid ${getClusterColor(cluster!)}40`,
                  borderLeft: `4px solid ${getClusterColor(cluster!)}`
                }}
              >
                <Typography variant="body2" sx={{ color: '#EEE', fontWeight: 'bold' }}>
                  {cluster}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                  {clusterUsers.length} users
                </Typography>
                {cluster === 'High Risk Night Shift' && (
                  <Chip
                    icon={<Warning />}
                    label="Critical"
                    size="small"
                    sx={{
                      mt: 1,
                      backgroundColor: '#DC262620',
                      color: '#DC2626'
                    }}
                  />
                )}
              </Box>
            );
          })}
      </Box>
    </Paper>
  );
};