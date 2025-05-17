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

/**
 * Component that displays a list of user activities with policy breach indicators
 */
export const ActivityList: React.FC<ActivityListProps> = ({ 
  activities, 
  policyIcons,
  onActivitySelect 
}) => {
  if (!activities || activities.length === 0) {
    return <Typography className="text-gray-400">No activities found</Typography>;
  }

  /**
   * Formats policy breaches for display using icons
   * @param breaches - Object containing policy breach information
   * @returns - Formatted policy breach icons
   */
  const formatBreaches = (breaches: Record<string, any> | null | undefined) => {
    if (!breaches) {
      return <span className="text-xs text-gray-400">No policy breaches</span>;
    }
    
    // Get categories that have breaches
    const categories = Object.keys(breaches).filter(key => {
      const value = breaches[key];
      return value !== undefined && 
        (Array.isArray(value) ? value.length > 0 : !!value);
    });
    
    if (categories.length === 0) {
      return <span className="text-xs text-gray-400">No policy breaches</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {categories.map(category => {
          if (typeof category !== 'string') return null;
          if (Array.isArray(breaches[category])) {
            return breaches[category].map((breach: string, index: number) => (
              <span
                key={`${category}-${index}`}
                className="inline-flex items-center gap-1 bg-[#2A1E3C] border border-[#7E22CE] text-purple-300 text-xs px-2 py-1 rounded-full font-poppins"
              >
                {policyIcons[breach] && (
                  <span className="h-4 w-4 flex items-center justify-center">{policyIcons[breach]}</span>
                )}
                {breach}
              </span>
            ));
          }
          return (
            <span
              key={category}
              className="inline-flex items-center gap-1 bg-[#2A1E3C] border border-[#7E22CE] text-purple-300 text-xs px-2 py-1 rounded-full font-poppins"
            >
              {policyIcons[category] && (
                <span className="h-4 w-4 flex items-center justify-center">{policyIcons[category]}</span>
              )}
              {category}
            </span>
          );
        })}
      </div>
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
    <div className="bg-[#1E1E2F] rounded-xl shadow-[inset_-4px_-4px_6px_#2a2a40,inset_4px_4px_6px_#0e0e1e] overflow-x-auto max-h-[70vh] overflow-y-auto font-poppins">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="bg-[#151524] text-gray-300 uppercase font-semibold">
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Last Activity</th>
            <th className="px-4 py-3">Integration</th>
            <th className="px-4 py-3">Risk Score</th>
            <th className="px-4 py-3">Policy Breaches</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity, idx) => (
            <tr
              key={activity.id}
              className={`odd:bg-[#24243A] even:bg-[#1E1E2F] hover:bg-[#312E51] transition-colors duration-200 border-b border-[#2E2E4A]`}
            >
              <td className="px-4 py-3 leading-relaxed text-gray-100">{getUserDisplayName(activity)}</td>
              <td className="px-4 py-3 leading-relaxed text-gray-100">
                {activity.date || activity.timestamp?.split('T')[0]}{' '}
                {activity.time || activity.timestamp?.split('T')[1]?.split('.')[0]}
              </td>
              <td className="px-4 py-3 leading-relaxed text-gray-100">{activity.integration}</td>
              <td className="px-4 py-3 leading-relaxed text-purple-400 font-semibold">{activity.riskScore}</td>
              <td className="px-4 py-3 leading-relaxed">{formatBreaches(activity.policiesBreached)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 