import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Chip
} from '@mui/material';
import { UserActivity } from '../types/activity';

interface ActivityDetailProps {
  activity: UserActivity;
}

/**
 * Component to display detailed information about a selected activity
 */
export const ActivityDetail: React.FC<ActivityDetailProps> = ({ activity }) => {
  if (!activity) {
    return <Typography>No activity selected</Typography>;
  }

  /**
   * Format date from timestamp
   */
  const formatDate = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };

  /**
   * Get severity color based on risk score
   */
  const getSeverityColor = (score: number) => {
    if (score >= 1500) return '#f44336'; // critical
    if (score >= 1000) return '#ff9800'; // high
    if (score >= 500) return '#ffeb3b'; // medium
    return '#4caf50'; // low
  };

  /**
   * Format a JSON object for display
   */
  const formatObject = (obj: any) => {
    if (!obj) return 'None';
    
    return (
      <Box sx={{ maxHeight: 200, overflowY: 'auto', fontSize: '0.875rem' }}>
        <pre style={{ margin: 0 }}>
          {JSON.stringify(obj, null, 2)}
        </pre>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Activity Details</Typography>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Typography variant="subtitle2" color="text.secondary">User</Typography>
          <Typography variant="body1">{activity.username || activity.userId || activity.user || 'Unknown'}</Typography>
        </Box>
        
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Typography variant="subtitle2" color="text.secondary">Date/Time</Typography>
          <Typography variant="body1">{formatDate(activity.timestamp)}</Typography>
        </Box>
        
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Typography variant="subtitle2" color="text.secondary">Activity</Typography>
          <Typography variant="body1">{activity.activity || 'Unknown'}</Typography>
        </Box>
        
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Typography variant="subtitle2" color="text.secondary">Integration</Typography>
          <Typography variant="body1">{activity.integration || 'Unknown'}</Typography>
        </Box>
        
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Typography variant="subtitle2" color="text.secondary">Risk Score</Typography>
          <Chip 
            label={activity.riskScore || 0} 
            sx={{ 
              bgcolor: getSeverityColor(activity.riskScore || 0),
              color: 'white',
              fontWeight: 'bold'
            }} 
          />
        </Box>
        
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Typography variant="subtitle2" color="text.secondary">Status</Typography>
          <Typography variant="body1">{activity.status || 'Unknown'}</Typography>
        </Box>
        
        {activity.department && (
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
            <Typography variant="subtitle2" color="text.secondary">Department</Typography>
            <Typography variant="body1">{activity.department}</Typography>
          </Box>
        )}
        
        {activity.location && (
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
            <Typography variant="subtitle2" color="text.secondary">Location</Typography>
            <Typography variant="body1">{activity.location}</Typography>
          </Box>
        )}
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Policy Breaches</Typography>
        {activity.policiesBreached ? (
          formatObject(activity.policiesBreached)
        ) : (
          <Typography variant="body2">No policy breaches</Typography>
        )}
      </Box>
      
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Additional Data</Typography>
        {activity.values ? (
          formatObject(activity.values)
        ) : (
          <Typography variant="body2">No additional data</Typography>
        )}
      </Box>
    </Paper>
  );
}; 