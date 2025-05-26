import React from 'react';
import '@fontsource/poppins/600.css';
import { UserActivity } from '../types/activity';

interface ActivityListProps {
  activities: UserActivity[];
  policyIcons: Record<string, React.ReactNode>;
}

/**
 * Component that displays a list of user activities with policy breach indicators
 */
export const ActivityList: React.FC<ActivityListProps> = ({ 
  activities, 
  policyIcons
}) => {
  if (!activities || activities.length === 0) {
    return <span className="text-gray-400">No activities found</span>;
  }

  /**
   * Formats policy breaches for display using icons
   * @param breaches - Object containing policy breach information
   * @returns - Formatted policy breach icons
   */
  const formatBreaches = (breaches: any): React.ReactNode => {
    // Quick return for empty breaches - be more specific about checking
    if (!breaches) {
      return <span className="text-xs text-gray-400">No policy breaches</span>;
    }
    
    // If it's an empty object, return no breaches
    if (typeof breaches === 'object' && Object.keys(breaches).length === 0) {
      return <span className="text-sm text-gray-400">No policy breaches</span>;
    }
    
    // Handle string-formatted JSON that wasn't properly parsed
    let parsedBreaches: any;
    
    // Handle string type breaches
    if (typeof breaches === 'string') {
      try {
        // Try to parse if it's a string (it might be a JSON string)
        const breachesStr = String(breaches).trim();
        if (breachesStr.length === 0) {
          return <span className="text-sm text-gray-400">No policy breaches</span>;
        }
        
        parsedBreaches = JSON.parse(breachesStr.replace(/\\"/g, '"').replace(/"{2,}/g, '"'));
        if (!parsedBreaches || Object.keys(parsedBreaches).length === 0) {
          return <span className="text-sm text-gray-400">No policy breaches</span>;
        }
      } catch (e) {
        // If parsing failed but there's text content, show it as a single breach
        return (
          <div className="flex gap-2 flex-wrap">
            <span
              className="inline-flex items-center bg-red-100 border border-red-300 text-red-800 text-xs px-2 py-1 rounded-full font-medium"
            >
              {String(breaches).substring(0, 50)}
            </span>
          </div>
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
          // Handle boolean or primitive values
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
            <th className="px-4 py-3">Integration</th>
            <th className="px-4 py-3">Risk Score</th>
            <th className="px-4 py-3">Policy Breaches</th>
            <th className="px-4 py-3">Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr
              key={activity.id}
              className={`odd:bg-[#24243A] even:bg-[#1E1E2F] hover:bg-[#312E51] transition-colors duration-200 border-b border-[#2E2E4A]`}
            >
              <td className="px-4 py-3 leading-relaxed text-gray-100">{getUserDisplayName(activity)}</td>
              <td className="px-4 py-3 leading-relaxed text-gray-100">{activity.integration}</td>
              <td className="px-4 py-3 leading-relaxed text-purple-400 font-semibold">{activity.riskScore}</td>
              <td className="px-4 py-3 leading-relaxed">{formatBreaches(activity.policiesBreached)}</td>
              <td className="px-4 py-3 leading-relaxed text-gray-100">
                {activity.date || activity.timestamp?.split('T')[0]}{' '}
                {activity.time || activity.timestamp?.split('T')[1]?.split('.')[0]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 