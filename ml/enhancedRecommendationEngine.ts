import { UserActivity, MLRecommendation, RecommendationCategory } from '../types/activity';
import { AnomalyDetector, AnomalyDetectionResult } from './anomalyDetector';

/**
 * Configuration for the enhanced recommendation engine
 */
export interface EnhancedRecommendationEngineConfig {
  sensitivityLevel: 'low' | 'medium' | 'high';
  confidenceThreshold: number;
  maxRecommendations: number;
  useManagerActions: boolean;
  useStatusValues: boolean;
  useAnomalyDetection: boolean;
  anomalyConfig?: any;
}

/**
 * Enhanced recommendation engine for ML-powered security insights
 * Incorporates user activity status values and manager actions
 */
export class EnhancedRecommendationEngine {
  private config: EnhancedRecommendationEngineConfig;
  private anomalyDetector: AnomalyDetector;
  
  constructor(config: Partial<EnhancedRecommendationEngineConfig> = {}) {
    this.config = {
      sensitivityLevel: 'medium',
      confidenceThreshold: 0.65,
      maxRecommendations: 20,
      useManagerActions: true,
      useStatusValues: true,
      useAnomalyDetection: true,
      ...config
    };
    
    // Initialize anomaly detector with appropriate settings
    this.anomalyDetector = new AnomalyDetector({
      lowThreshold: 0.6,
      mediumThreshold: 0.75, 
      highThreshold: 0.9,
      ...(config.anomalyConfig || {})
    });
  }
  
  /**
   * Generate enhanced recommendations based on user activities
   */
  public generateRecommendations(activities: UserActivity[]): MLRecommendation[] {
    if (!activities || activities.length === 0) {
      console.log("No activities provided to enhanced recommendation engine");
      return [];
    }
    
    console.log(`Analyzing ${activities.length} activities for genuine security risks`);
    
    // Initialize anomaly detector with historical data
    if (this.config.useAnomalyDetection) {
      console.log("Building anomaly detection baselines...");
      this.anomalyDetector.buildBaselines(activities);
    }
    
    const recommendations: MLRecommendation[] = [];
    
    // Generate different types of recommendations
    this.addPolicyBreachRecommendations(activities, recommendations);
    this.addDataExfiltrationRecommendations(activities, recommendations);
    this.addSuspiciousTimingRecommendations(activities, recommendations);
    
    if (this.config.useAnomalyDetection) {
      this.addAnomalyBasedRecommendations(activities, recommendations);
    }
    
    // Adjust recommendations based on manager actions if enabled
    if (this.config.useManagerActions) {
      this.adjustRecommendationsWithManagerActions(recommendations, activities);
    }
    
    // Filter recommendations by confidence threshold
    // Only show insights that meet minimum confidence requirements
    const MINIMUM_CONFIDENCE = this.config.confidenceThreshold;
    const filteredRecommendations = recommendations
      .filter(rec => rec.confidence >= MINIMUM_CONFIDENCE)
      .sort((a, b) => b.confidence - a.confidence);
    
    // Analyze final recommendation distribution
    const categories = {} as Record<string, number>;
    filteredRecommendations.forEach(rec => {
      categories[rec.category] = (categories[rec.category] || 0) + 1;
    });
    
    console.log(`Enhanced analysis found ${filteredRecommendations.length} genuine security risks`);
    console.log("Risk categories distribution:", categories);
    
    return filteredRecommendations;
  }
  
  /**
   * Generate policy breach recommendations
   */
  private addPolicyBreachRecommendations(activities: UserActivity[], recommendations: MLRecommendation[]): void {
    // Find users who accessed sensitive data
    const sensitiveDataActivities = activities.filter(a => a.sensitiveData === true);
    
    // Group by user
    const userGroups = this.groupByUser(sensitiveDataActivities);
    
    // Generate recommendations for each user
    Object.entries(userGroups).forEach(([user, userActivities], index) => {
      if (userActivities.length > 0) {
        // Boost confidence if status is concern
        let confidenceBoost = 0;
        
        if (this.config.useStatusValues) {
          const concernActivities = userActivities.filter(a => a.status === 'concern');
          const concernRatio = concernActivities.length / userActivities.length;
          confidenceBoost = concernRatio * 0.15; // Up to 15% boost
        }
        
        // Calculate base confidence based on volume and sensitivity
        const baseConfidence = 0.82 + (Math.min(0.15, userActivities.length / 20));
        
        // Generate recommendation
        recommendations.push({
          id: `policy-breach-${index}`,
          title: `Sensitive Data Access Alert`,
          description: `User ${user} has accessed or transferred sensitive data ${userActivities.length} times`,
          category: 'policy_breach',
          severity: 'high',
          confidence: Math.min(0.99, baseConfidence + confidenceBoost),
          affectedUsers: [user],
          relatedActivities: userActivities.map(a => a.id).filter(Boolean),
          suggestedActions: [
            'Review data access policies and permissions',
            'Verify business justification for sensitive data access',
            'Implement data loss prevention measures'
          ],
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  /**
   * Generate data exfiltration recommendations
   */
  private addDataExfiltrationRecommendations(activities: UserActivity[], recommendations: MLRecommendation[]): void {
    // Find download/export activities
    const exportActivities = activities.filter(a => 
      a.activityType === 'download' || 
      a.activityType === 'export' ||
      a.activityType === 'email' ||
      a.activityType === 'share'
    );
    
    // Group by user
    const userGroups = this.groupByUser(exportActivities);
    
    // Find users with high volume data transfers
    Object.entries(userGroups).forEach(([user, userActivities], index) => {
      // Skip if not enough activities
      if (userActivities.length < 3) return;
      
      // Calculate total data volume
      const totalVolume = userActivities.reduce((sum, activity) => {
        return sum + (activity.dataVolume || activity.fileSize || 0);
      }, 0);
      
      // Skip if volume is low
      if (totalVolume < 10000) return; // Example threshold
      
      // Find max single transfer
      const maxTransfer = Math.max(...userActivities.map(a => a.dataVolume || a.fileSize || 0));
      
      // Generate deviation metrics
      const deviationFactors = [
        `High document count: ${userActivities.length} (${(userActivities.length / 2).toFixed(1)}x average)`,
        `Large data transfer: ${(totalVolume / 1000000).toFixed(1)} MB (${(totalVolume / 500000).toFixed(1)}x larger than usual)`,
      ];
      
      // Add data source deviation if available
      const dataSources = new Set(userActivities.filter(a => a.dataSource).map(a => a.dataSource));
      if (dataSources.size > 0) {
        deviationFactors.push(`Unusual data source: ${Array.from(dataSources).join(', ')}`);
      }
      
      // Calculate confidence based on volume and status
      let confidence = 0.7 + Math.min(0.2, totalVolume / 1000000);
      
      // Boost if there are concern statuses
      if (this.config.useStatusValues) {
        const concernActivities = userActivities.filter(a => a.status === 'concern');
        confidence += (concernActivities.length / userActivities.length) * 0.1;
      }
      
      recommendations.push({
        id: `data-exfil-${index}`,
        title: `Potential Data Exfiltration: Multiple downloads by ${user}`,
        description: `User ${user} has downloaded an unusual amount of data in a short period`,
        category: 'data_exfiltration',
        severity: totalVolume > 50000 ? 'high' : 'medium',
        confidence: Math.min(0.97, confidence),
        affectedUsers: [user],
        relatedActivities: userActivities.map(a => a.id).filter(Boolean),
        suggestedActions: [
          'Review data transfer logs for additional context',
          'Check if sensitive data was accessed or transferred',
          'Consider temporarily restricting user access permissions'
        ],
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Generate suspicious timing recommendations
   */
  private addSuspiciousTimingRecommendations(activities: UserActivity[], recommendations: MLRecommendation[]): void {
    // Find activities with timestamps
    const timedActivities = activities.filter(a => a.timestamp || a.hour !== undefined);
    
    console.log(`Analyzing ${timedActivities.length} activities with timestamps for suspicious timing`);
    
    // Group by user
    const userGroups = this.groupByUser(timedActivities);
    console.log(`Found ${Object.keys(userGroups).length} users with timed activities`);
    
    // Analyze each user's activity timing patterns
    Object.entries(userGroups).forEach(([user, userActivities], index) => {
      // Skip analysis if not enough activities
      if (userActivities.length < 2) return;
      
      // Map all activities to hours and count occurrences of each hour
      const hourCounts = new Array(24).fill(0);
      let totalActivities = 0;
      let offHoursCount = 0;
      
      userActivities.forEach(activity => {
        let hour: number | null = null;
        
        if (activity.hour !== undefined && activity.hour !== null) {
          hour = activity.hour;
        } else if (activity.timestamp) {
          try {
            hour = new Date(activity.timestamp).getHours();
          } catch (e) {
            // Invalid timestamp format
            return;
          }
        }
        
        if (hour !== null && hour >= 0 && hour < 24) {
          hourCounts[hour]++;
          totalActivities++;
          
          // Consider 8pm-6am (20-23, 0-5) as off-hours
          if (hour >= 20 || hour < 6) {
            offHoursCount++;
          }
        }
      });
      
      // Calculate off-hours ratio
      const offHoursRatio = offHoursCount / totalActivities;
      
      // Only flag as suspicious if ratio is significant (>25%) and there are multiple off-hours activities
      if (offHoursRatio > 0.25 && offHoursCount >= 2) {
        // Calculate confidence based on ratio and count
        const confidenceBase = 0.65 + Math.min(0.25, offHoursRatio);
        
        // Boost confidence if we have more data points
        const countBoost = Math.min(0.1, offHoursCount / 10);
        
        // Status adjustment if available
        let statusBoost = 0;
        if (this.config.useStatusValues) {
          const concernActivities = userActivities.filter(a => a.status === 'concern');
          statusBoost = (concernActivities.length / userActivities.length) * 0.1;
        }
        
        const confidence = Math.min(0.95, confidenceBase + countBoost + statusBoost);
        
        // Get specific off-hours times for detailed description
        const offHourTimes = userActivities
          .map(a => {
            if (!a.timestamp) return null;
            try {
              const date = new Date(a.timestamp);
              const hour = date.getHours();
              if (hour >= 20 || hour < 6) {
                return date.toLocaleTimeString();
              }
            } catch (e) { /* Invalid timestamp */ }
            return null;
          })
          .filter(Boolean)
          .slice(0, 3) as string[];
          
        // Create more descriptive title and description
        const timeDescription = offHourTimes.length > 0 
          ? `including at ${offHourTimes.join(', ')}` 
          : 'outside normal business hours';
          
        recommendations.push({
          id: `timing-${user}-${Date.now()}`,
          title: `Suspicious Timing: Off-hours activity by ${user}`,
          description: `User ${user} has accessed systems during off-hours ${timeDescription} (${offHoursCount} instances)`,
          category: 'suspicious_timing',
          severity: confidence > 0.85 ? 'high' : 'medium',
          confidence,
          affectedUsers: [user],
          relatedActivities: userActivities
            .filter(a => {
              if (a.timestamp) {
                try {
                  const hour = new Date(a.timestamp).getHours();
                  return hour >= 20 || hour < 6;
                } catch (e) { 
                  return false; 
                }
              } else if (a.hour !== undefined && a.hour !== null) {
                return a.hour >= 20 || a.hour < 6;
              }
              return false;
            })
            .map(a => a.id)
            .filter(Boolean),
          suggestedActions: [
            'Verify if user had legitimate reason for activity at unusual time',
            'Check for authorization for off-hours work',
            'Review pattern of off-hours access over time'
          ],
          timestamp: new Date().toISOString()
        });
      }
    });
    
    console.log(`Generated ${recommendations.filter(r => r.category === 'suspicious_timing').length} suspicious timing recommendations`);
  }
  
  /**
   * Add recommendations based on anomaly detection
   */
  private addAnomalyBasedRecommendations(activities: UserActivity[], recommendations: MLRecommendation[]): void {
    // Detect anomalies
    const anomalyResults = this.anomalyDetector.detectAnomalies(activities);
    
    // Group anomalies by user
    const userAnomalies = new Map<string, UserActivity[]>();
    
    activities.forEach(activity => {
      if (!activity.id || !activity.user) return;
      
      const result = anomalyResults.get(activity.id);
      if (result && result.isAnomaly) {
        if (!userAnomalies.has(activity.user)) {
          userAnomalies.set(activity.user, []);
        }
        userAnomalies.get(activity.user)!.push(activity);
      }
    });
    
    // Generate recommendations for each user with anomalies
    userAnomalies.forEach((anomalousActivities, user) => {
      if (anomalousActivities.length === 0) return;
      
      // Group by anomaly type
      const typeGroups = anomalousActivities.reduce((acc, activity) => {
        if (!activity.id) return acc;
        
        const result = anomalyResults.get(activity.id);
        if (!result) return acc;
        
        const type = result.anomalyType || 'unknown';
        if (!acc[type]) {
          acc[type] = {
            activities: [],
            confidence: 0,
            factors: new Set<string>()
          };
        }
        
        acc[type].activities.push(activity);
        acc[type].confidence = Math.max(acc[type].confidence, result.confidence);
        result.factors.forEach(f => acc[type].factors.add(f));
        
        return acc;
      }, {} as Record<string, { activities: UserActivity[], confidence: number, factors: Set<string> }>);
      
      // Generate a recommendation for each anomaly type
      Object.entries(typeGroups).forEach(([type, data], idx) => {
        const category = this.mapAnomalyTypeToCategory(type);
        const title = this.getAnomalyTitle(type, user);
        const description = this.getAnomalyDescription(type, user, data.activities.length);
        
        recommendations.push({
          id: `anomaly-${user}-${type}-${idx}`,
          title,
          description,
          category,
          severity: data.confidence > 0.8 ? 'high' : 'medium',
          confidence: data.confidence,
          affectedUsers: [user],
          relatedActivities: data.activities.map(a => a.id).filter(Boolean),
          suggestedActions: this.getAnomalySuggestedActions(type),
          timestamp: new Date().toISOString()
        });
      });
    });
  }
  
  /**
   * Adjust recommendations based on manager actions
   */
  private adjustRecommendationsWithManagerActions(recommendations: MLRecommendation[], activities: UserActivity[]): void {
    // For each recommendation, check if related activities have manager actions
    recommendations.forEach(recommendation => {
      if (!recommendation.relatedActivities || recommendation.relatedActivities.length === 0) {
        return;
      }
      
      // Count manager actions
      const relatedActivitiesWithManagerAction = activities.filter(activity => 
        activity.id && 
        recommendation.relatedActivities!.includes(activity.id) && 
        activity.managerAction
      );
      
      // Skip if no manager actions
      if (relatedActivitiesWithManagerAction.length === 0) {
        return;
      }
      
      // Count each type of manager action
      const actionCounts: Record<string, number> = {};
      relatedActivitiesWithManagerAction.forEach(activity => {
        const action = activity.managerAction as string;
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      });
      
      // Calculate ratio of activities with manager actions
      const actionRatio = relatedActivitiesWithManagerAction.length / recommendation.relatedActivities.length;
      
      // Apply adjustments based on action types
      let confidenceAdjustment = 0;
      
      if (actionCounts['escalated'] || actionCounts['flagged']) {
        // Escalated or flagged means more likely to be real issue
        const escalatedCount = (actionCounts['escalated'] || 0) + (actionCounts['flagged'] || 0);
        confidenceAdjustment += 0.1 * (escalatedCount / relatedActivitiesWithManagerAction.length);
      }
      
      if (actionCounts['authorized'] || actionCounts['legitimate']) {
        // Authorized or legitimate means less likely to be issue
        const authorizedCount = (actionCounts['authorized'] || 0) + (actionCounts['legitimate'] || 0);
        confidenceAdjustment -= 0.2 * (authorizedCount / relatedActivitiesWithManagerAction.length);
      }
      
      // Apply adjustment proportional to action coverage
      recommendation.confidence = Math.min(0.99, Math.max(0.1, 
        recommendation.confidence + (confidenceAdjustment * actionRatio)
      ));
    });
  }
  
  /**
   * Group activities by user
   */
  private groupByUser(activities: UserActivity[]): Record<string, UserActivity[]> {
    return activities.reduce((acc, activity) => {
      if (!activity.user) return acc;
      
      if (!acc[activity.user]) {
        acc[activity.user] = [];
      }
      
      acc[activity.user].push(activity);
      return acc;
    }, {} as Record<string, UserActivity[]>);
  }
  
  /**
   * Map anomaly type to recommendation category
   */
  private mapAnomalyTypeToCategory(anomalyType: string): RecommendationCategory {
    switch (anomalyType) {
      case 'unusual_timing': return 'suspicious_timing';
      case 'data_exfiltration': return 'data_exfiltration';
      case 'unusual_behavior': return 'unusual_behavior';
      default: return 'unusual_behavior';
    }
  }
  
  /**
   * Get title for anomaly recommendation
   */
  private getAnomalyTitle(anomalyType: string, user: string): string {
    switch (anomalyType) {
      case 'unusual_timing':
        return `Unusual Timing Pattern: Off-hours activity by ${user}`;
      case 'data_exfiltration':
        return `Anomalous Data Transfer: Unusual volume by ${user}`;
      case 'unusual_behavior':
        return `Behavior Anomaly: Unusual activity pattern by ${user}`;
      default:
        return `Anomaly Detection: Unusual pattern by ${user}`;
    }
  }
  
  /**
   * Get description for anomaly recommendation
   */
  private getAnomalyDescription(anomalyType: string, user: string, count: number): string {
    switch (anomalyType) {
      case 'unusual_timing':
        return `User ${user} has ${count} activities at unusual times that deviate from normal patterns`;
      case 'data_exfiltration':
        return `User ${user} has transferred data in a way that significantly deviates from normal patterns`;
      case 'unusual_behavior':
        return `User ${user} has exhibited ${count} activities that deviate from their normal behavior patterns`;
      default:
        return `User ${user} has exhibited unusual activity patterns detected by ML analysis`;
    }
  }
  
  /**
   * Get suggested actions for anomaly type
   */
  private getAnomalySuggestedActions(anomalyType: string): string[] {
    switch (anomalyType) {
      case 'unusual_timing':
        return [
          'Review login and activity timestamps',
          'Verify if user has approval for off-hours work',
          'Check if account may have been compromised'
        ];
      case 'data_exfiltration':
        return [
          'Analyze data transfer destinations',
          'Review size and content of transferred data',
          'Consider implementing additional DLP controls'
        ];
      case 'unusual_behavior':
        return [
          "Review user's recent activity history",
          'Check for changes in role or responsibilities',
          'Verify if user account behaviors match expected profile'
        ];
      default:
        return [
          'Investigate further to determine nature of anomaly',
          'Review recent user activity for context',
          'Consider temporary heightened monitoring'
        ];
    }
  }
} 