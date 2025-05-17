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

// Format date and time for display
function formatDateTime(activity: UserActivity): string {
  // Check if we have both date and time
  if (activity.date && activity.time) {
    return `${activity.date} ${activity.time}`;
  }
  
  // If we only have date
  if (activity.date) {
    // Add a default time if none exists
    return `${activity.date} 09:00`;
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
  const formatBreaches = (breaches: any): React.ReactNode => {
    // Add debug logging to see what's coming in
    console.log('Policy breaches format input:', breaches);
    
    // Quick return for empty breaches - be more specific about checking
    if (!breaches) {
      return <Typography variant="body2">No policy breaches</Typography>;
    }
    
    // If it's an empty object, return no breaches
    if (typeof breaches === 'object' && Object.keys(breaches).length === 0) {
      return <Typography variant="body2">No policy breaches</Typography>;
    }
    
    // Handle string-formatted JSON that wasn't properly parsed
    let parsedBreaches: any;
    
    // Handle string type breaches
    if (typeof breaches === 'string') {
      try {
        // Try to parse if it's a string (it might be a JSON string)
        const breachesStr = String(breaches).trim();
        if (breachesStr.length === 0) {
          return <Typography variant="body2">No policy breaches</Typography>;
        }
        
        parsedBreaches = JSON.parse(breachesStr.replace(/\\"/g, '"').replace(/"{2,}/g, '"'));
        if (!parsedBreaches || Object.keys(parsedBreaches).length === 0) {
          return <Typography variant="body2">No policy breaches</Typography>;
        }
      } catch (e) {
        // If parsing failed but there's text content, show it as a single breach
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={String(breaches).substring(0, 50)}
              size="small"
              color="error"
              variant="outlined"
              sx={{ m: 0.5 }}
            />
          </Box>
        );
      }
    } else {
      // Already an object, use directly
      parsedBreaches = breaches;
    }
    
    // Get categories that have breaches
    const categories = Object.keys(parsedBreaches).filter(key => {
      const value = parsedBreaches[key];
      return value !== undefined && value !== null && 
        (Array.isArray(value) ? value.length > 0 : Boolean(value));
    });
    
    // Log the categories found for debugging
    console.log('Policy breach categories found:', categories);
    
    if (categories.length === 0) {
      return <Typography variant="body2">No policy breaches</Typography>;
    }
    
    // Limit the number of rendered breach chips to improve performance
    const MAX_CHIPS = 5;
    let chipCount = 0;
    
    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {categories.map(category => {
          if (typeof category !== 'string' || chipCount >= MAX_CHIPS) return null;
          
          // Handle array values (multiple breaches in a category)
          if (Array.isArray(parsedBreaches[category])) {
            // Limit the number of array items we render for better performance
            const breaches = parsedBreaches[category].slice(0, MAX_CHIPS - chipCount);
            chipCount += breaches.length;
            
            return breaches.map((breach: any, index: number) => (
              <Chip
                key={`${category}-${index}`}
                label={`${category}: ${String(breach).substring(0, 20)}`}
                size="small"
                color="error"
                variant="outlined"
                sx={{
                  m: 0.5,
                  borderRadius: 9999,
                  background: 'rgba(255,235,235,0.4)',
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
          
          // Handle boolean or primitive values
          chipCount++;
          return (
            <Chip
              key={category}
              label={String(category).substring(0, 30)}
              size="small"
              color="error"
              variant="outlined"
              sx={{ 
                m: 0.5,
                background: 'rgba(255,235,235,0.4)', 
                fontWeight: 500
              }}
            />
          );
        })}
        {chipCount >= MAX_CHIPS && categories.length > MAX_CHIPS && (
          <Chip
            label={`+${categories.length - MAX_CHIPS} more`}
            size="small"
            color="default"
            variant="outlined"
            sx={{ m: 0.5 }}
          />
        )}
      </Box>
    );
  };

  /**
   * Truncates text to a specified length
   * @param text - The text to truncate
   * @param length - Maximum length
   * @returns - Truncated text
   */
  const truncateText = (text: string | undefined, length: number = 30) => {
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
            <TableCell>Risk Score</TableCell>
            <TableCell>Policy Breaches</TableCell>
            <TableCell>Last Activity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activities.map((activity) => (
            <TableRow 
              key={activity.id || `activity-${Math.random().toString(36).substr(2, 9)}`} 
              hover
              onClick={() => onActivitySelect && onActivitySelect(activity)}
              sx={{ 
                cursor: onActivitySelect ? 'pointer' : 'default',
                backgroundColor: getRiskColor(activity.riskScore)
              }}
            >
              <TableCell>{getUserDisplayName(activity)}</TableCell>
              <TableCell>{activity.riskScore}</TableCell>
              <TableCell>{formatBreaches(activity.policiesBreached)}</TableCell>
              <TableCell>{formatDateTime(activity)}</TableCell>
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
const getRiskColor = (score: number | undefined): string => {
  if (!score) return 'transparent'; // Handle undefined
  if (score >= 2000) return 'rgba(255, 0, 0, 0.08)';  // Critical risk
  if (score >= 1500) return 'rgba(255, 80, 0, 0.08)'; // High risk
  if (score >= 1000) return 'rgba(255, 165, 0, 0.08)'; // Medium-high risk
  if (score >= 500) return 'rgba(255, 255, 0, 0.04)'; // Medium risk
  return 'transparent'; // Low risk
}; 