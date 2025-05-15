import React from 'react';
import '@fontsource/poppins/600.css';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Typography,
  Chip,
  Box
} from '@mui/material';
import { UserActivity, PolicyIcon } from '../types/activity';

interface ActivityListProps {
  activities: UserActivity[];
  policyIcons: Record<string, React.ReactNode>;
  onActivitySelect?: (activity: UserActivity) => void;
}

/**
 * Component that displays a list of user activities with policy breach indicators
 */
export const ActivityList: React.FC<ActivityListProps> = ({ 
  activities, 
  policyIcons,
  onActivitySelect 
}) => {
  if (!activities || activities.length === 0) {
    return <Typography>No activities found</Typography>;
  }

  /**
   * Formats policy breaches for display using icons
   * @param breaches - Object containing policy breach information
   * @returns - Formatted policy breach icons
   */
  const formatBreaches = (breaches: Record<string, any> | null | undefined) => {
    if (!breaches) {
      return <Typography variant="body2">No policy breaches</Typography>;
    }
    
    // Get categories that have breaches
    const categories = Object.keys(breaches).filter(key => {
      const value = breaches[key];
      return value !== undefined && 
        (Array.isArray(value) ? value.length > 0 : !!value);
    });
    
    if (categories.length === 0) {
      return <Typography variant="body2">No policy breaches</Typography>;
    }
    
    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {categories.map(category => {
          if (typeof category !== 'string') return null;
          if (Array.isArray(breaches[category])) {
            return breaches[category].map((breach: string, index: number) => (
              <Chip
                key={`${category}-${index}`}
                icon={policyIcons[breach] ? <span>{policyIcons[breach]}</span> : undefined}
                label={breach}
                size="small"
                color="error"
                variant="outlined"
                sx={{
                  m: 0.5,
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)',
                  fontWeight: 600,
                  fontFamily: 'Poppins, sans-serif',
                  color: '#e11d48',
                  border: '1.5px solid #e11d48',
                  px: 1.5,
                  py: 0.5,
                }}
              />
            ));
          }
          return (
            <Chip
              key={category}
              icon={policyIcons[category] ? <span>{policyIcons[category]}</span> : undefined}
              label={category}
              size="small"
              color="error"
              variant="outlined"
              sx={{ m: 0.5 }}
            />
          );
        })}
      </Box>
    );
  };

  /**
   * Truncates text to a specified length
   * @param text - The text to truncate
   * @param length - Maximum length
   * @returns - Truncated text
   */
  const truncateText = (text: string, length: number = 30) => {
    if (!text) return '';
    return text.length > length ? `${text.substring(0, length)}...` : text;
  };

  /**
   * Get the user display name from activity
   * @param activity - The activity object
   * @returns - User display name
   */
  const getUserDisplayName = (activity: UserActivity): string => {
    // First try username
    if (activity.username && activity.username.trim() !== '') {
      return activity.username;
    }
    
    // Then try user
    if (activity.user && activity.user.trim() !== '') {
      return activity.user;
    }
    
    // Fallback to userId
    if (activity.userId && activity.userId.trim() !== '') {
      return activity.userId;
    }
    
    // Final fallback
    return 'Unknown User';
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Date/Time</TableCell>
            <TableCell>Activity</TableCell>
            <TableCell>Integration</TableCell>
            <TableCell>Risk Score</TableCell>
            <TableCell>Policy Breaches</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activities.map((activity) => (
            <TableRow 
              key={activity.id} 
              hover
              onClick={() => onActivitySelect && onActivitySelect(activity)}
              sx={{ 
                cursor: onActivitySelect ? 'pointer' : 'default',
                backgroundColor: getRiskColor(activity.riskScore)
              }}
            >
              <TableCell>{getUserDisplayName(activity)}</TableCell>
              <TableCell>
                {activity.date || activity.timestamp?.split('T')[0]}
                {' '}
                {activity.time || activity.timestamp?.split('T')[1]?.split('.')[0]}
              </TableCell>
              <TableCell>{truncateText(activity.activity)}</TableCell>
              <TableCell>{activity.integration}</TableCell>
              <TableCell>{activity.riskScore}</TableCell>
              <TableCell>{formatBreaches(activity.policiesBreached)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Returns a background color based on risk score
 * @param score - Risk score value
 * @returns - CSS color value
 */
const getRiskColor = (score: number): string => {
  if (score >= 90) return 'rgba(255, 0, 0, 0.08)';  // High risk
  if (score >= 70) return 'rgba(255, 165, 0, 0.08)'; // Medium-high risk
  if (score >= 40) return 'rgba(255, 255, 0, 0.08)'; // Medium risk
  return 'transparent'; // Low risk
}; 