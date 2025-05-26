import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { FaExclamationTriangle, FaChartPie, FaUsers, FaShieldAlt } from 'react-icons/fa';

/**
 * Activity statistics prop type, simplified version of ActivityStatistics
 */
interface UserActivityStats {
  totalActivities: number;
  averageRiskScore: number;
  riskScoreDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  integrationBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  breachCategories: Record<string, number>;
  timeDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    night?: number;
  };
}

interface ActivityStatsProps {
  stats: UserActivityStats;
}

/**
 * Component to display high-level activity statistics
 */
export const ActivityStats: React.FC<ActivityStatsProps> = ({ stats }) => {
  if (!stats) {
    return <Typography>No statistics available</Typography>;
  }
  
  // Calculate high risk count (high + critical)
  const highRiskCount = (stats.riskScoreDistribution?.high || 0) + 
                        (stats.riskScoreDistribution?.critical || 0);
  
  // Calculate breach count
  const breachCount = Object.values(stats.breachCategories || {}).reduce((sum, count) => sum + count, 0);
  
  // Calculate active users (approx)
  const activeUsers = Math.max(
    5,
    Math.round(stats.totalActivities / Math.max(10, Object.keys(stats.integrationBreakdown || {}).length))
  );
  
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
      {/* Total Activities */}
      <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 3' } }}>
        <Paper elevation={1} sx={{ 
          p: 2, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          bgcolor: 'primary.main',
          color: 'white'
        }}>
          <FaChartPie size={24} style={{ marginBottom: 8 }} />
          <Typography variant="h4">{stats.totalActivities}</Typography>
          <Typography variant="body2">Total Activities</Typography>
        </Paper>
      </Box>
      
      {/* High Risk Activities */}
      <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 3' } }}>
        <Paper elevation={1} sx={{ 
          p: 2, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          bgcolor: 'warning.main',
          color: 'white'
        }}>
          <FaExclamationTriangle size={24} style={{ marginBottom: 8 }} />
          <Typography variant="h4">{highRiskCount}</Typography>
          <Typography variant="body2">High Risk Activities</Typography>
        </Paper>
      </Box>
      
      {/* Policy Breaches */}
      <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 3' } }}>
        <Paper elevation={1} sx={{ 
          p: 2, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          bgcolor: 'error.main',
          color: 'white'
        }}>
          <FaShieldAlt size={24} style={{ marginBottom: 8 }} />
          <Typography variant="h4">{breachCount}</Typography>
          <Typography variant="body2">Policy Breaches</Typography>
        </Paper>
      </Box>
      
      {/* Active Users */}
      <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 3' } }}>
        <Paper elevation={1} sx={{ 
          p: 2, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          bgcolor: 'info.main',
          color: 'white'
        }}>
          <FaUsers size={24} style={{ marginBottom: 8 }} />
          <Typography variant="h4">{activeUsers}</Typography>
          <Typography variant="body2">Active Users</Typography>
        </Paper>
      </Box>
      
      {/* Average Risk Score */}
      <Box sx={{ gridColumn: 'span 12' }}>
        <Paper elevation={1} sx={{ 
          p: 2, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="body1">Average Risk Score</Typography>
          <Box sx={{ 
            px: 2, 
            py: 0.5, 
            borderRadius: 1, 
            bgcolor: getRiskScoreColor(stats.averageRiskScore),
            color: 'white',
            fontWeight: 'bold'
          }}>
            {stats.averageRiskScore}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

/**
 * Get color based on risk score
 */
function getRiskScoreColor(score: number): string {
  if (score >= 80) return '#f44336'; // critical
  if (score >= 60) return '#ff9800'; // high
  if (score >= 40) return '#ffeb3b'; // medium
  return '#4caf50'; // low
} 