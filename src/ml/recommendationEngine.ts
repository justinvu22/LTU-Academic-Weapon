import * as tf from '@tensorflow/tfjs';
import { UserActivity, MLRecommendation } from '../types/UserActivityType';

interface ActivityFeatures {
  severityScore: number;
  frequencyScore: number;
  timeScore: number;
}

interface RiskPattern {
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedActions: string[];
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

export class RecommendationEngine {
  private model: tf.LayersModel | null = null;

  async initialize() {
    // Create a simple neural network for anomaly detection
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [3], units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  private extractFeatures(activities: UserActivity[]): ActivityFeatures[] {
    const userActivityMap = new Map<string, UserActivity[]>();
    
    // Group activities by user
    activities.forEach(activity => {
      const userActivities = userActivityMap.get(activity.user) || [];
      userActivities.push(activity);
      userActivityMap.set(activity.user, userActivities);
    });

    return Array.from(userActivityMap.values()).map(userActivities => {
      const severityScore = this.calculateRiskScore(userActivities);
      const frequencyScore = this.calculateFrequencyScore(userActivities);
      const timeScore = this.calculateTimeScore(userActivities);

      return { severityScore, frequencyScore, timeScore };
    });
  }

  private calculateRiskScore(activities: UserActivity[]): number {
    const riskScores = activities.map(activity => activity.riskScore);
    const avgRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / activities.length;
    
    return Math.min(avgRiskScore / 3000, 1);
  }

  private calculateFrequencyScore(activities: UserActivity[]): number {
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    const now = new Date();
    const recentActivities = activities.filter(activity => {
      const [day, month, year] = activity.date.split('/').map(Number);
      const [hours, minutes] = activity.time.split(':').map(Number);
      const activityDate = new Date(year, month - 1, day, hours, minutes);
      const timeDiff = now.getTime() - activityDate.getTime();
      return timeDiff <= timeWindow;
    });
    
    return recentActivities.length / activities.length;
  }

  private calculateTimeScore(activities: UserActivity[]): number {
    const timestamps = activities.map(activity => {
      const [day, month, year] = activity.date.split('/').map(Number);
      const [hours, minutes] = activity.time.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes).getTime();
    });
    
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    return timeSpan / (24 * 60 * 60 * 1000); // Convert to days
  }

  async generateRecommendations(activities: UserActivity[]): Promise<MLRecommendation[]> {
    if (!this.model) {
      await this.initialize();
    }

    const features = this.extractFeatures(activities);
    const tensor = tf.tensor2d(features.map(f => [f.severityScore, f.frequencyScore, f.timeScore]));
    
    const predictions = await this.model!.predict(tensor) as tf.Tensor;
    const scores = await predictions.data();

    const recommendations: MLRecommendation[] = [];
    const users = Array.from(new Set(activities.map(a => a.user)));

    users.forEach((user, index) => {
      const score = scores[index];
      if (score > 0.7) { // High risk threshold
        recommendations.push({
          id: `rec-${Date.now()}-${index}`,
          title: 'High Risk Activity Detected',
          description: 'Unusual pattern of high-severity activities detected',
          severity: 'high',
          confidence: score,
          affectedUsers: [user],
          suggestedActions: [
            'Review recent user activities',
            'Implement additional monitoring',
            'Consider temporary access restrictions'
          ],
          timestamp: new Date().toISOString()
        });
      }
    });

    return recommendations;
  }
}

/**
 * Generate an analyst comment for a specific activity
 * @param activity The user activity to analyze
 * @returns An analyst comment explaining the security concern
 */
export const generateAnalystComment = (activity: UserActivity): string => {
  const { policiesBreached, values, integration, riskScore, user } = activity;
  
  // Default comment parts
  let riskLevel = 'low';
  if (riskScore > 2000) riskLevel = 'critical';
  else if (riskScore > 1500) riskLevel = 'high';
  else if (riskScore > 1000) riskLevel = 'medium';
  
  // Base comment
  let comment = `This activity is a ${riskLevel} risk event`;
  
  // Add integration context
  if (integration === 'si-email') {
    comment += ' involving email communication';
    
    // Add recipients if available
    if (values.destinations && values.destinations.length > 0) {
      const destinations = values.destinations;
      if (destinations.some(d => d.includes('gmail') || d.includes('hotmail') || d.includes('yahoo'))) {
        comment += ' to personal email accounts';
      } else if (destinations.some(d => !d.includes('zenith.com'))) {
        comment += ' to external recipients';
      }
    }
  } else if (integration === 'si-cloud') {
    comment += ` involving cloud storage (${values.cloudProvider || 'unknown provider'})`;
  } else if (integration === 'si-usb') {
    comment += ` involving external USB device (${values.device || 'unknown device'})`;
  } else if (integration === 'si-application') {
    comment += ` involving application usage (${values.application || 'unknown application'})`;
  }
  
  // Add breach type details
  const breachTypes = [];
  
  if (policiesBreached.dataLeakage && policiesBreached.dataLeakage.length > 0) {
    breachTypes.push('data leakage');
  }
  
  if (policiesBreached.sensitive && policiesBreached.sensitive.length > 0) {
    breachTypes.push('sensitive information exposure');
  }
  
  if (policiesBreached.pii && policiesBreached.pii.length > 0) {
    breachTypes.push('PII exposure');
  }
  
  if (policiesBreached.phi && policiesBreached.phi.length > 0) {
    breachTypes.push('PHI exposure');
  }
  
  if (policiesBreached.financial && policiesBreached.financial.length > 0) {
    breachTypes.push('financial data exposure');
  }
  
  if (policiesBreached.userAtRisk && policiesBreached.userAtRisk.length > 0) {
    breachTypes.push('user at risk behavior');
  }
  
  if (breachTypes.length > 0) {
    comment += `. The activity contains ${breachTypes.join(', ')}.`;
  }
  
  // Add recommendation based on risk level
  if (riskLevel === 'critical' || riskLevel === 'high') {
    comment += ' Immediate review and action is recommended.';
  } else if (riskLevel === 'medium') {
    comment += ' Further investigation is recommended.';
  } else {
    comment += ' Monitoring is advised.';
  }
  
  return comment;
};

/**
 * Calculate confidence score for a recommendation based on multiple factors
 */
const calculateConfidence = (
  pattern: string,
  user: string,
  activities: UserActivity[]
): number => {
  // Get all activities for this user
  const userActivities = activities.filter(a => a.user === user);
  if (userActivities.length === 0) return 0.5;
  
  // Base confidence level
  let confidence = 0.7;
  
  // Pattern-specific confidence adjustments
  switch (pattern) {
    case 'high_risk_score': {
      // Calculate average risk score for this user
      const avgRiskScore = userActivities.reduce((sum, a) => sum + a.riskScore, 0) / userActivities.length;
      
      // Higher confidence if multiple high-risk activities
      const highRiskCount = userActivities.filter(a => a.riskScore > 1500).length;
      
      // Adjust confidence based on risk pattern
      if (highRiskCount >= 3) confidence += 0.2;
      if (avgRiskScore > 1800) confidence += 0.1;
      
      break;
    }
    
    case 'multiple_breaches': {
      // Count total breaches across all user activities
      const breachCounts = userActivities.map(activity => {
        return Object.values(activity.policiesBreached)
          .filter(breaches => breaches && breaches.length > 0)
          .length;
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
        const hour = parseInt(activity.time.split(':')[0]);
        return hour < 6 || hour > 20;
      });
      
      // Higher confidence if pattern is consistent
      const unusualRatio = unusualHourActivities.length / userActivities.length;
      
      if (unusualRatio > 0.7) confidence += 0.2; // Consistent behavior
      if (unusualHourActivities.length >= 3) confidence += 0.1; // Multiple occurrences
      
      break;
    }
    
    case 'sensitive_data': {
      // Count activities with sensitive data breaches
      const sensitiveDataActivities = userActivities.filter(activity => 
        activity.policiesBreached.pii || 
        activity.policiesBreached.phi || 
        activity.policiesBreached.pci
      );
      
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

export const generateRecommendations = (activities: UserActivity[]): MLRecommendation[] => {
  const recommendations: MLRecommendation[] = [];
  const userPatterns = new Map<string, Set<string>>();

  // Analyze activities for each user
  activities.forEach((activity) => {
    const patterns = new Set<string>();
    
    // Check risk score
    if (activity.riskScore > 1500) {
      patterns.add('high_risk_score');
    }

    // Check policy breaches
    const breachCount = Object.values(activity.policiesBreached)
      .filter(breaches => breaches && breaches.length > 0)
      .length;
    if (breachCount > 2) {
      patterns.add('multiple_breaches');
    }

    // Check time patterns
    const hour = parseInt(activity.time.split(':')[0]);
    if (hour < 6 || hour > 20) {
      patterns.add('unusual_time');
    }

    // Check for sensitive data
    if (activity.policiesBreached.pii || activity.policiesBreached.phi || activity.policiesBreached.pci) {
      patterns.add('sensitive_data');
    }

    // Update user patterns
    const existingPatterns = userPatterns.get(activity.user) || new Set();
    patterns.forEach(pattern => existingPatterns.add(pattern));
    userPatterns.set(activity.user, existingPatterns);
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