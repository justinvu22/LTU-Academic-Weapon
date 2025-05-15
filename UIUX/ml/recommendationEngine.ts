import { UserActivity } from './types/activity';

interface RiskPattern {
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedActions: string[];
}

export interface MLRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedUsers: string[];
  suggestedActions: string[];
  timestamp: string;
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    pattern: 'high_risk_score',
    severity: 'high',
    description: 'Multiple high-risk activities detected',
    suggestedActions: [
      'Review user access permissions',
      'Implement additional monitoring',
      'Schedule security training',
    ],
  },
  {
    pattern: 'multiple_breaches',
    severity: 'medium',
    description: 'Multiple policy breach categories in single activities',
    suggestedActions: [
      'Conduct security review',
      'Update security policies',
      'Implement stricter controls',
    ],
  },
  {
    pattern: 'unusual_time',
    severity: 'low',
    description: 'Activities during unusual hours',
    suggestedActions: [
      'Review access patterns',
      'Implement time-based restrictions',
      'Monitor for similar patterns',
    ],
  },
  {
    pattern: 'sensitive_data',
    severity: 'high',
    description: 'Handling of sensitive data detected',
    suggestedActions: [
      'Review data access policies',
      'Implement data loss prevention',
      'Enhance monitoring',
    ],
  },
];

/**
 * Calculate confidence score for a recommendation based on multiple factors
 */
const calculateConfidence = (
  pattern: string,
  user: string,
  activities: UserActivity[]
): number => {
  // Get all activities for this user
  const userActivities = activities.filter(a => 
    a.username === user || a.userId === user || a.user === user
  );
  
  if (userActivities.length === 0) return 0.5;
  
  // Base confidence level
  let confidence = 0.7;
  
  // Pattern-specific confidence adjustments
  switch (pattern) {
    case 'high_risk_score': {
      // Calculate average risk score for this user
      const avgRiskScore = userActivities.reduce((sum, a) => sum + (a.riskScore || 0), 0) / userActivities.length;
      
      // Higher confidence if multiple high-risk activities
      const highRiskCount = userActivities.filter(a => (a.riskScore || 0) > 1500).length;
      
      // Adjust confidence based on risk pattern
      if (highRiskCount >= 3) confidence += 0.2;
      if (avgRiskScore > 1800) confidence += 0.1;
      
      break;
    }
    
    case 'multiple_breaches': {
      // Count total breaches across all user activities
      const breachCounts = userActivities.map(activity => {
        if (!activity.policiesBreached) return 0;
        
        return Object.keys(activity.policiesBreached).length;
      });
      
      // Calculate max number of breach categories in a single activity
      const maxBreaches = Math.max(...breachCounts);
      
      // Adjust confidence based on breach pattern
      if (maxBreaches >= 4) confidence += 0.2;
      if (maxBreaches >= 2 && userActivities.length >= 3) confidence += 0.1;
      
      break;
    }
    
    case 'unusual_time': {
      // Count activities during unusual hours
      const unusualHourActivities = userActivities.filter(activity => {
        let hour = -1;
        
        if (activity.timestamp) {
          const date = new Date(activity.timestamp);
          hour = date.getHours();
        } else if (activity.time) {
          const timeParts = activity.time.split(':');
          if (timeParts.length >= 1) {
            hour = parseInt(timeParts[0], 10);
          }
        }
        
        return hour >= 0 && (hour < 6 || hour > 20);
      });
      
      // Higher confidence if pattern is consistent
      const unusualRatio = unusualHourActivities.length / userActivities.length;
      
      if (unusualRatio > 0.7) confidence += 0.2; // Consistent behavior
      if (unusualHourActivities.length >= 3) confidence += 0.1; // Multiple occurrences
      
      break;
    }
    
    case 'sensitive_data': {
      // Count activities with sensitive data breaches
      const sensitiveDataActivities = userActivities.filter(activity => {
        if (!activity.policiesBreached) return false;
        
        return (
          activity.policiesBreached.pii ||
          activity.policiesBreached.phi ||
          activity.policiesBreached.pci
        );
      });
      
      // Calculate sensitivity score
      const sensitivityScore = sensitiveDataActivities.length / userActivities.length;
      
      if (sensitivityScore > 0.5) confidence += 0.2;
      if (sensitiveDataActivities.length >= 2) confidence += 0.1;
      
      break;
    }
  }
  
  // Cap confidence between 0.5 and 0.98
  return Math.min(Math.max(confidence, 0.5), 0.98);
};

/**
 * Generates ML-powered recommendations based on activity data
 * Identifies patterns and anomalies to suggest security actions
 */
export const generateRecommendations = (activities: UserActivity[]): MLRecommendation[] => {
  if (!activities || activities.length === 0) {
    return [];
  }
  
  const recommendations: MLRecommendation[] = [];
  const userPatterns = new Map<string, Set<string>>();

  // Analyze activities for each user
  activities.forEach((activity) => {
    // Skip activities without a valid user identifier
    const user = activity.username || activity.userId || activity.user;
    if (!user) return;
    
    const patterns = new Set<string>();
    
    // Check risk score
    if ((activity.riskScore || 0) > 1500) {
      patterns.add('high_risk_score');
    }

    // Check policy breaches
    if (activity.policiesBreached) {
      const breachCount = Object.keys(activity.policiesBreached).length;
      if (breachCount > 2) {
        patterns.add('multiple_breaches');
      }
      
      // Check for sensitive data
      if (
        activity.policiesBreached.pii || 
        activity.policiesBreached.phi || 
        activity.policiesBreached.pci
      ) {
        patterns.add('sensitive_data');
      }
    }

    // Check time patterns
    let hour = -1;
    if (activity.timestamp) {
      const date = new Date(activity.timestamp);
      hour = date.getHours();
    } else if (activity.time) {
      const timeParts = activity.time.split(':');
      if (timeParts.length >= 1) {
        hour = parseInt(timeParts[0], 10);
      }
    }
    
    if (hour >= 0 && (hour < 6 || hour > 20)) {
      patterns.add('unusual_time');
    }

    // Update user patterns
    const existingPatterns = userPatterns.get(user) || new Set();
    patterns.forEach(pattern => existingPatterns.add(pattern));
    userPatterns.set(user, existingPatterns);
  });

  // Generate recommendations based on patterns
  userPatterns.forEach((patterns, user) => {
    patterns.forEach(pattern => {
      const riskPattern = RISK_PATTERNS.find(p => p.pattern === pattern);
      if (riskPattern) {
        // Calculate dynamic confidence score
        const confidence = calculateConfidence(pattern, user, activities);
        
        // Only create recommendations with sufficient confidence
        if (confidence >= 0.6) {
          recommendations.push({
            id: `${user}_${pattern}_${Date.now()}`,
            title: `Security Alert: ${riskPattern.description}`,
            description: `User ${user} has shown patterns of ${riskPattern.description.toLowerCase()}`,
            severity: riskPattern.severity,
            confidence, // Dynamic confidence score
            affectedUsers: [user],
            suggestedActions: riskPattern.suggestedActions,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  });

  // Sort recommendations by confidence (highest first)
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}; 