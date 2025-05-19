import { UserActivity, ActivityStatistics, MLRecommendation, TimeDistribution } from '../types/activity';

/**
 * Risk level thresholds based on actual data analysis from CSV
 */
export const RISK_THRESHOLDS = {
  LOW: 1000,    // 0-999
  MEDIUM: 1500, // 1000-1499
  HIGH: 2000,   // 1500-1999
  CRITICAL: 2000  // 2000+
};

/**
 * Normalize and process activity data from CSV or API
 * @param rawActivities Raw activity data
 * @returns Processed and normalized activity data
 */
export function processActivityData(rawActivities: any[]): UserActivity[] {
  if (!rawActivities || !Array.isArray(rawActivities) || rawActivities.length === 0) {
    return [];
  }

  return rawActivities.map((activity: any, index: number) => {
    // Ensure ID is present
    const id = activity.id || activity.activityId || `activity-${index}`;
    
    // Normalize user information - the CSV uses 'user' field, not 'username'
    const userId = activity.userId || id;
    // Normalize username and email - ensure we're always using the same case
    const username = (activity.username || activity.user || 'unknown').toLowerCase();
    
    // Process dates and times
    const { timestamp, date, time } = normalizeDateTime(activity);
    
    // Process risk score - ensure it's always a number
    const riskScore = normalizeRiskScore(activity.riskScore);
    
    // Determine severity based on risk score
    const severity = categorizeRiskScore(riskScore);
    
    // Normalize status
    const status = normalizeStatus(activity.status);
    
    // Process policy breaches
    const policiesBreached = normalizePolicyBreaches(activity.policiesBreached);
    
    // Process values
    const values = normalizeValues(activity.values);

    // Normalize integration (remove 'si-' prefix if present)
    const integration = normalizeIntegration(activity.integration);
    
    // Return normalized activity object
    return {
      id,
      userId,
      username,
      user: activity.user,
      timestamp,
      date,
      time,
      integration,
      activity: activity.activity || '',
      status,
      riskScore,
      severity,
      values,
      policiesBreached,
      department: activity.department || '',
      location: activity.location || '',
      deviceId: activity.deviceId || '',
      fileType: activity.fileType || '',
      fileSize: activity.fileSize || 0,
      destination: activity.destination || '',
      accessType: activity.accessType || '',
      dataVolume: activity.dataVolume || 0,
      isAnomaly: activity.isAnomaly || false
    };
  });
}

/**
 * Calculate time distribution from activities
 */
export function calculateTimeDistribution(activities: UserActivity[]): TimeDistribution {
  console.log(`Calculating time distribution for ${activities.length} activities`);
  
  // Initialize time periods
  const distribution: TimeDistribution = {
    morning: 0,   // 6:00 AM - 11:59 AM
    afternoon: 0, // 12:00 PM - 5:59 PM
    evening: 0,   // 6:00 PM - 11:59 PM
    night: 0      // 12:00 AM - 5:59 AM
  };
  
  // Track how many activities were processed for diagnostics
  let processedCount = 0;
  let missingTimeCount = 0;
  
  // Process each activity
  activities.forEach(activity => {
    try {
      // If hour is already extracted, use it directly
      if (activity.hour !== undefined && activity.hour !== null) {
        // Map hour to time period
        const hour = activity.hour;
        if (hour >= 6 && hour < 12) distribution.morning++;
        else if (hour >= 12 && hour < 18) distribution.afternoon++;
        else if (hour >= 18 && hour < 24) distribution.evening++;
        else distribution.night++;
        
        processedCount++;
        return;
      }
      
      // Fall back to parsing the time field if it exists
      if (activity.time) {
        // Try to extract hour from time string
        const timeMatch = /(\d{1,2})[:h]/i.exec(activity.time);
        if (timeMatch && timeMatch[1]) {
          const hour = parseInt(timeMatch[1], 10);
          
          // Map hour to time period
          if (hour >= 6 && hour < 12) distribution.morning++;
          else if (hour >= 12 && hour < 18) distribution.afternoon++;
          else if (hour >= 18 && hour < 24) distribution.evening++;
          else distribution.night++;
          
          processedCount++;
          return;
        }
      }
      
      // Last fallback: try timestamp if present
      if (activity.timestamp) {
        try {
          const hour = new Date(activity.timestamp).getHours();
          
          // Map hour to time period
          if (hour >= 6 && hour < 12) distribution.morning++;
          else if (hour >= 12 && hour < 18) distribution.afternoon++;
          else if (hour >= 18 && hour < 24) distribution.evening++;
          else distribution.night++;
          
          processedCount++;
          return;
        } catch (e) {
          // If timestamp parsing fails, proceed to count as missing
        }
      }
      
      // If we reach here, we couldn't determine the time
      missingTimeCount++;
      
    } catch (error) {
      console.error('Error calculating time distribution for activity:', error);
      missingTimeCount++;
    }
  });
  
  // Log diagnostic info
  console.log(`Time distribution calculation complete: ${processedCount} processed, ${missingTimeCount} with missing time`);
  console.log('Distribution results:', distribution);
  
  return distribution;
}

/**
 * Generate statistics from activity data
 * @param activities Processed activity data
 * @returns Statistics object
 */
export function generateStatistics(activities: UserActivity[]): ActivityStatistics {
  if (!activities || activities.length === 0) {
    return {
      totalActivities: 0,
      highRiskActivities: 0,
      totalPolicyBreaches: 0,
      breachCategories: {},
      averageRiskScore: 0,
      usersAtRisk: 0,
      topRiskUsers: [],
      timeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      integrationDistribution: {}
    };
  }

  // Count high risk activities (includes both high and critical)
  const highRiskActivities = activities.filter(a => 
    (a.riskScore && a.riskScore >= RISK_THRESHOLDS.HIGH) || false
  ).length;

  // Count critical risk activities (for reference)
  const criticalRiskActivities = activities.filter(a => 
    (a.riskScore && a.riskScore >= RISK_THRESHOLDS.CRITICAL) || false
  ).length;
  
  console.log(`High risk activities: ${highRiskActivities}, Critical: ${criticalRiskActivities}`);

  // Count total policy breaches
  let totalPolicyBreaches = 0;
  const breachCategories: Record<string, number> = {};
  
  activities.forEach(activity => {
    if (activity.policiesBreached) {
      Object.entries(activity.policiesBreached).forEach(([category, breaches]) => {
        if (!breachCategories[category]) {
          breachCategories[category] = 0;
        }

        if (Array.isArray(breaches)) {
          breachCategories[category] += breaches.length;
          totalPolicyBreaches += breaches.length;
        } else if (breaches) {
          breachCategories[category] += 1;
          totalPolicyBreaches += 1;
        }
      });
    }
  });

  // Calculate average risk score
  const totalRiskScore = activities.reduce((sum, activity) => sum + (activity.riskScore || 0), 0);
  const averageRiskScore = activities.length ? Math.round(totalRiskScore / activities.length) : 0;

  // Count users at risk (users with any high or critical risk activities)
  const userRiskMap = new Map<string, { high: number, critical: number }>();
  
  activities.forEach(activity => {
    const username = (activity.username || activity.userId || activity.user || 'unknown').toLowerCase();
    if (!userRiskMap.has(username)) {
      userRiskMap.set(username, { high: 0, critical: 0 });
    }
    
    const userRisk = userRiskMap.get(username)!;
    const riskScore = activity.riskScore || 0;
    
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
      userRisk.critical++;
    } else if (riskScore >= RISK_THRESHOLDS.HIGH) {
      userRisk.high++;
    }
  });
  
  // Count users with any high or critical activities
  const usersWithHighRisk = Array.from(userRiskMap.values())
    .filter(user => user.high > 0 || user.critical > 0).length;
    
  console.log(`Users at risk: ${usersWithHighRisk}`);

  // Get top risk users
  const userRiskScoreMap = new Map<string, number>();
  activities.forEach(activity => {
    const user = (activity.username || activity.userId || activity.user || 'unknown').toLowerCase();
    const currentRisk = userRiskScoreMap.get(user) || 0;
    userRiskScoreMap.set(user, currentRisk + (activity.riskScore || 0));
  });

  const topRiskUsers = Array.from(userRiskScoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user]) => user);

  // Calculate time distribution using our dedicated function
  const timeDistribution = calculateTimeDistribution(activities);

  // Calculate integration distribution
  const integrationDistribution: Record<string, number> = {};
  activities.forEach(activity => {
    if (activity.integration) {
      const integration = activity.integration;
      integrationDistribution[integration] = (integrationDistribution[integration] || 0) + 1;
    }
  });

  return {
    totalActivities: activities.length,
    highRiskActivities,
    totalPolicyBreaches,
    breachCategories,
    averageRiskScore,
    usersAtRisk: usersWithHighRisk,
    topRiskUsers,
    timeDistribution,
    integrationDistribution
  };
}

/**
 * Normalize date and time information from various formats
 */
function normalizeDateTime(activity: any): { timestamp: string, date?: string, time?: string } {
  let timestamp = '';
  let date: string | undefined = undefined;
  let time: string | undefined = undefined;

  // Try to use existing timestamp if available
  if (activity.timestamp) {
    timestamp = activity.timestamp;
    
    // Extract date and time components for consistency
    const dateObj = new Date(activity.timestamp);
    if (!isNaN(dateObj.getTime())) {
      date = dateObj.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      time = dateObj.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  } 
  // Try to construct timestamp from date and time fields
  else if (activity.date) {
    date = activity.date;
    time = activity.time || '00:00';
    
    // Try to parse date in format DD/MM/YYYY or any other common format
    try {
      let isoDate = date;
      
      // Handle DD/MM/YYYY format
      if (typeof date === 'string' && date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) {
          // Convert to YYYY-MM-DD format for Date constructor
          isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } 
      // Handle YYYY-MM-DD format
      else if (typeof date === 'string' && date.includes('-')) {
        // Already in ISO format, keep as is
        isoDate = date;
      }
      
      // Format time properly
      let timeString = '00:00';
      if (time) {
        if (typeof time === 'string' && time.includes(':')) {
          timeString = time;
        } else if (typeof time === 'number') {
          // If time is a number like 13.5, convert to "13:30"
          const hours = Math.floor(time);
          const minutes = Math.round((time - hours) * 60);
          timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
      
      // Create ISO timestamp
      timestamp = `${isoDate}T${timeString}:00`;
      
      // Validate the timestamp
      const testDate = new Date(timestamp);
      if (isNaN(testDate.getTime())) {
        console.warn(`Invalid date/time combination: ${date} ${time}, fallback to current time`);
        timestamp = new Date().toISOString();
      }
    } catch (e) {
      console.warn(`Error parsing date/time: ${date} ${time}`, e);
      timestamp = new Date().toISOString();
    }
  }

  return {
    timestamp,
    date,
    time
  };
}

/**
 * Normalize risk score to a number
 */
function normalizeRiskScore(score: any): number {
  if (typeof score === 'number') {
    return score;
  }
  
  if (typeof score === 'string') {
    return parseInt(score, 10) || 0;
  }
  
  return 0;
}

/**
 * Categorize risk score into severity levels
 */
function categorizeRiskScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= RISK_THRESHOLDS.HIGH) return 'high';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

/**
 * Normalize status field
 */
function normalizeStatus(status: any): string {
  if (!status) return 'underReview';
  
  const normalized = String(status).trim().toLowerCase();
  
  // Check for common variations and normalize
  if (/under.*review/i.test(normalized)) return 'underReview';
  if (/trust/i.test(normalized)) return 'trusted';
  if (/concern/i.test(normalized) && /non/i.test(normalized)) return 'nonConcern';
  if (/concern/i.test(normalized)) return 'concern';
  
  // If no match, check if it's already one of our allowed values
  const allowedStatuses = ['underReview', 'trusted', 'concern', 'nonConcern'];
  if (allowedStatuses.includes(normalized)) return normalized;
  
  // Default fallback
  return 'underReview';
}

/**
 * Normalize policy breaches object
 */
function normalizePolicyBreaches(policiesBreached: any): Record<string, boolean | string[] | number> {
  if (!policiesBreached) return {};
  
  // If it's a string, try to parse it as JSON
  if (typeof policiesBreached === 'string') {
    try {
      const parsed = JSON.parse(policiesBreached);
      console.log('Parsed policiesBreached from string:', parsed);
      return parsed;
    } catch (e) {
      console.warn('Failed to parse policiesBreached JSON string:', e);
      return {};
    }
  }
  
  // If it's already an object, normalize to ensure consistent structure
  if (typeof policiesBreached === 'object' && policiesBreached !== null) {
    // Deep copy to avoid reference issues
    const normalized: Record<string, boolean | string[] | number> = {};
    
    // Ensure each entry has the correct type
    Object.entries(policiesBreached).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        normalized[key] = [...value]; // Copy array
      } else if (typeof value === 'boolean') {
        normalized[key] = value;
      } else if (typeof value === 'number') {
        normalized[key] = value;
      } else if (value) {
        // Convert other truthy values to boolean true
        normalized[key] = true;
      }
    });
    
    console.log('Normalized policiesBreached:', normalized, 
      'Keys:', Object.keys(normalized).length);
    return normalized;
  }
  
  console.warn('Invalid policiesBreached type:', typeof policiesBreached);
  return {};
}

/**
 * Normalize values object
 */
function normalizeValues(values: any): Record<string, any> {
  if (!values) return {};
  
  // If it's a string, try to parse it as JSON
  if (typeof values === 'string') {
    try {
      return JSON.parse(values);
    } catch (e) {
      return {};
    }
  }
  
  // If it's already an object, return it
  if (typeof values === 'object' && values !== null) {
    return values;
  }
  
  return {};
}

/**
 * Normalize integration field (remove 'si-' prefix if present)
 */
function normalizeIntegration(integration: any): string {
  if (!integration) return '';
  
  const integrationStr = String(integration).toLowerCase();
  
  // Remove 'si-' prefix if present
  if (integrationStr.startsWith('si-')) {
    return integrationStr.substring(3);
  }
  
  return integrationStr;
}

/**
 * Generate ML recommendations based on activity data
 * This is a placeholder for the actual ML recommendation generation
 */
export function generateRecommendations(activities: UserActivity[]): MLRecommendation[] {
  // This would be replaced with actual ML recommendation logic
  // For now, just return an empty array
  return [];
}

/**
 * Process CSV data fully to return processed activities, statistics, and recommendations
 */
export function processCSVData(csvData: any[]) {
  const activities = processActivityData(csvData);
  const statistics = generateStatistics(activities);
  const recommendations = generateRecommendations(activities);
  
  return {
    activities,
    statistics,
    recommendations,
    processingTime: Date.now(),
  };
}

/**
 * Calculate statistics from an array of activities
 * @param activities Array of user activities
 * @returns Statistics object
 */
export async function calculateStatistics(activities: UserActivity[]): Promise<ActivityStatistics> {
  // Use the existing generateStatistics function
  return generateStatistics(activities);
} 