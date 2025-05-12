import Papa from 'papaparse';
import { UserActivity, PolicyBreach, ActivityValues } from '../types/UserActivityType';

// Allowed values for status field
const ALLOWED_STATUSES = ['underReview', 'trusted', 'concern', 'nonConcern'];

/**
 * Safely double-parses a JSON string that might be double-encoded
 * @param str The string to parse
 * @returns Parsed object or empty object if parsing fails
 */
function safeDoubleParse(str: string): any {
  if (!str) return {};
  
  try {
    // Remove any surrounding quotes if present
    let cleanStr = str.trim();
    if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
      cleanStr = cleanStr.slice(1, -1);
    }
    
    // first parse
    let parsed = JSON.parse(cleanStr);
    
    // If it's still a string, parse again
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing JSON:', error, 'Original string:', str);
    return {};
  }
}

/**
 * Normalizes status values to ensure they match our expected values
 * @param status The status string from CSV
 * @returns Normalized status string that matches allowed values
 */
function normalizeStatus(status: string): string {
  if (!status) return 'underReview';
  
  const normalized = status.trim();
  
  // Check for common variations and normalize
  if (/under.*review/i.test(normalized)) return 'underReview';
  if (/trust/i.test(normalized)) return 'trusted';
  if (/concern/i.test(normalized) && /non/i.test(normalized)) return 'nonConcern';
  if (/concern/i.test(normalized)) return 'concern';
  
  // If no match, check if it's already one of our allowed values
  if (ALLOWED_STATUSES.includes(normalized)) return normalized;
  
  // Default fallback
  console.warn(`Unrecognized status: "${status}" - defaulting to underReview`);
  return 'underReview';
}

/**
 * Process CSV data into UserActivity objects
 * @param csvData CSV data as string
 * @returns Array of UserActivity objects
 */
export const processCSV = (csvData: string): UserActivity[] => {
  console.log('Processing CSV data...');
  
  const parseResult = Papa.parse(csvData, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });
  
  if (parseResult.errors.length > 0) {
    console.warn('CSV parsing errors:', parseResult.errors);
  }
  
  return (parseResult.data as any[]).map((row, index) => {
    try {
      // For debugging
      if (index < 3) {
        console.log(`Row ${index} status: "${row.status}"`);
      }
      
      // Parse and normalize
      const policiesBreached = safeDoubleParse(row.policiesBreached) as PolicyBreach;
      const values = safeDoubleParse(row.values) as ActivityValues;
      const status = normalizeStatus(row.status);
      const riskScore = Number(row.riskScore) || 0;
      
      return {
        activityId: row.activityId || `activity-${index}`,
        user: row.user || '',
        date: row.date || '',
        time: row.time || '',
        riskScore,
        integration: row.integration || '',
        policiesBreached,
        values,
        status,
        managerAction: row.managerAction || undefined,
      } as UserActivity;
    } catch (error) {
      console.error('Error processing row:', error, row);
      // Return a minimal valid activity so the UI doesn't break
      return {
        activityId: `error-${index}`,
        user: row.user || 'Error',
        date: row.date || '',
        time: row.time || '',
        riskScore: 0,
        integration: 'si-email',
        policiesBreached: {},
        values: {},
        status: 'underReview',
      } as UserActivity;
    }
  });
};

export const validateCSVHeaders = (headers: string[]): boolean => {
  const requiredHeaders = ['userId', 'timestamp', 'activityType', 'severity', 'details'];
  return requiredHeaders.every((header) => headers.includes(header));
};

export const calculateActivityStats = (activities: UserActivity[]) => {
  const stats = {
    totalActivities: activities.length,
    averageRiskScore: 0,
    riskScoreDistribution: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    integrationBreakdown: {
      email: 0,
      cloud: 0,
      usb: 0,
      application: 0
    },
    statusBreakdown: {
      underReview: 0,
      trusted: 0,
      concern: 0,
      nonConcern: 0
    },
    breachCategories: {
      dataLeakage: 0,
      pii: 0,
      phi: 0,
      pci: 0,
      financial: 0,
      sensitive: 0,
      userAtRisk: 0,
      fraud: 0
    },
    timeDistribution: {
      morning: 0,
      afternoon: 0,
      evening: 0
    }
  };

  let totalRiskScore = 0;

  activities.forEach(activity => {
    // Calculate average risk score
    totalRiskScore += activity.riskScore;

    // Risk score distribution
    if (activity.riskScore < 1000) stats.riskScoreDistribution.low++;
    else if (activity.riskScore < 1500) stats.riskScoreDistribution.medium++;
    else if (activity.riskScore < 2000) stats.riskScoreDistribution.high++;
    else stats.riskScoreDistribution.critical++;

    // Integration breakdown
    const integration = activity.integration.replace('si-', '');
    stats.integrationBreakdown[integration as keyof typeof stats.integrationBreakdown]++;

    // Status breakdown
    stats.statusBreakdown[activity.status]++;

    // Breach categories
    Object.keys(activity.policiesBreached).forEach(category => {
      if (category in stats.breachCategories) {
        stats.breachCategories[category as keyof typeof stats.breachCategories]++;
      }
    });

    // Time distribution
    const hour = parseInt(activity.time.split(':')[0]);
    if (hour < 12) stats.timeDistribution.morning++;
    else if (hour < 17) stats.timeDistribution.afternoon++;
    else stats.timeDistribution.evening++;
  });

  stats.averageRiskScore = totalRiskScore / activities.length;

  return stats;
}; 