"use client";

import * as tf from '@tensorflow/tfjs';
import { 
  UserActivity, 
  MLRecommendation, 
  RecommendationCategory 
} from '../types/activity';

// Constants for recommendation engine
const HIGH_RISK_THRESHOLD = 1500;
const MEDIUM_RISK_THRESHOLD = 1000;
const UNUSUAL_HOUR_START = 22; // 10 PM
const UNUSUAL_HOUR_END = 6; // 6 AM
const CONSECUTIVE_FAILURES_THRESHOLD = 3;
const BULK_OPERATIONS_THRESHOLD = 5;
const HIGH_DATA_VOLUME_THRESHOLD = 50; // MB

/**
 * Configuration options for recommendation engine
 */
interface RecommendationEngineConfig {
  sensitivityLevel?: 'low' | 'medium' | 'high';
  includeAllRecommendations?: boolean;
  confidenceThreshold?: number;
  maxRecommendations?: number;
  useAdvancedAnalysis?: boolean;
}

/**
 * Default configuration for recommendation engine
 */
const DEFAULT_CONFIG: RecommendationEngineConfig = {
  sensitivityLevel: 'medium',
  includeAllRecommendations: false,
  confidenceThreshold: 0.65,
  maxRecommendations: 10,
  useAdvancedAnalysis: true,
};

/**
 * Pattern detection function types
 */
type PatternDetector = (activities: UserActivity[], user: string) => MLRecommendation | null;

/**
 * Recommendation Engine that analyzes user activities and generates ML-based recommendations
 */
export class RecommendationEngine {
  private config: RecommendationEngineConfig;
  private patternDetectors: PatternDetector[];
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  /**
   * Creates a new recommendation engine instance
   * @param config Configuration options
   */
  constructor(config: RecommendationEngineConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patternDetectors = this.initializePatternDetectors();
    this.initializeModel();
  }

  /**
   * Initializes the TensorFlow model for anomaly detection
   * This is a lightweight client-side model
   */
  private async initializeModel(): Promise<void> {
    try {
      // In a production environment, we would load from a CDN or local storage
      // For now, we'll create a simple model for anomaly detection
      const model = tf.sequential();
      
      // Add layers to create a simple autoencoder for anomaly detection
      model.add(tf.layers.dense({
        inputShape: [10], // Input features
        units: 6,
        activation: 'relu'
      }));
      
      model.add(tf.layers.dense({
        units: 3,
        activation: 'relu'
      }));
      
      model.add(tf.layers.dense({
        units: 6,
        activation: 'relu'
      }));
      
      model.add(tf.layers.dense({
        units: 10,
        activation: 'sigmoid'
      }));
      
      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
      });
      
      this.model = model;
      this.isModelLoaded = true;
    } catch (error) {
      console.error('Failed to initialize TensorFlow model:', error);
      // Continue without ML model if it fails to load
      this.isModelLoaded = false;
    }
  }

  /**
   * Initialize all pattern detectors used by the engine
   */
  private initializePatternDetectors(): PatternDetector[] {
    return [
      this.detectHighRiskActivities,
      this.detectUnusualTimePatterns,
      this.detectSensitiveDataAccess,
      this.detectBulkOperations,
      this.detectFailedAccessAttempts,
      this.detectMultiLocationAccess,
      this.detectDataExfiltration,
      this.detectUnusualApplicationUsage,
      this.detectAccountSharing,
      this.detectSequentialRiskyBehavior,
    ];
  }

  /**
   * Generate recommendations based on user activities
   * @param activities Array of user activities to analyze
   * @returns Array of ML-based recommendations
   */
  public generateRecommendations(activities: UserActivity[]): MLRecommendation[] {
    if (!activities || activities.length === 0) {
      return [];
    }
    
    const recommendations: MLRecommendation[] = [];
    const usersMap = new Map<string, UserActivity[]>();
    
    // Group activities by user
    activities.forEach(activity => {
      const user = activity.username || activity.userId || activity.user || '';
      if (!user) return;
      
      const userActivities = usersMap.get(user) || [];
      userActivities.push(activity);
      usersMap.set(user, userActivities);
    });
    
    // Run pattern detection for each user
    usersMap.forEach((userActivities, user) => {
      this.patternDetectors.forEach(detector => {
        const recommendation = detector.call(this, userActivities, user);
        if (recommendation && 
            recommendation.confidence >= (this.config.confidenceThreshold || DEFAULT_CONFIG.confidenceThreshold!)) {
          recommendations.push(recommendation);
        }
      });
    });
    
    // Add cross-user patterns if advanced analysis is enabled
    if (this.config.useAdvancedAnalysis) {
      this.detectCrossUserPatterns(activities).forEach(recommendation => {
        if (recommendation.confidence >= (this.config.confidenceThreshold || DEFAULT_CONFIG.confidenceThreshold!)) {
          recommendations.push(recommendation);
        }
      });
    }
    
    // Sort by confidence score and severity (highest first)
    const sortedRecommendations = recommendations.sort((a, b) => {
      const severityScore = (severity: string) => {
        switch (severity) {
          case 'critical': return 4;
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 0;
        }
      };
      
      // First sort by severity, then by confidence
      const severityDiff = severityScore(b.severity) - severityScore(a.severity);
      if (severityDiff !== 0) return severityDiff;
      
      return b.confidence - a.confidence;
    });
    
    // Limit to max recommendations if specified
    if (this.config.maxRecommendations) {
      return sortedRecommendations.slice(0, this.config.maxRecommendations);
    }
    
    return sortedRecommendations;
  }

  /**
   * Detect when a user has multiple high-risk activities
   */
  private detectHighRiskActivities(activities: UserActivity[], user: string): MLRecommendation | null {
    const highRiskActivities = activities.filter(a => (a.riskScore || 0) > HIGH_RISK_THRESHOLD);
    
    if (highRiskActivities.length >= 2) {
      return {
        id: `${user}_high_risk_${Date.now()}`,
        title: 'Critical Risk Profile Detected',
        description: `User ${user} has performed ${highRiskActivities.length} high-risk activities that require immediate review`,
        severity: 'high',
        confidence: 0.85 + (Math.min(highRiskActivities.length, 5) * 0.03),
        affectedUsers: [user],
        suggestedActions: [
          'Review user access permissions immediately',
          'Implement additional monitoring for this user',
          'Consider temporary access restriction to sensitive systems',
          'Schedule security awareness training',
        ],
        timestamp: new Date().toISOString(),
        category: 'high_risk_sequence',
        relatedActivities: highRiskActivities.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Detect unusual time patterns (activities during non-business hours)
   */
  private detectUnusualTimePatterns(activities: UserActivity[], user: string): MLRecommendation | null {
    const nightActivities = activities.filter(activity => {
        let hour = -1;
        
        if (activity.timestamp) {
          const date = new Date(activity.timestamp);
          hour = date.getHours();
        } else if (activity.time) {
          const timeParts = activity.time.split(':');
          if (timeParts.length >= 1) {
          hour = parseInt(timeParts[0]);
        }
      }
      
      return hour >= 0 && (hour >= UNUSUAL_HOUR_START || hour < UNUSUAL_HOUR_END);
    });
    
    if (nightActivities.length >= 2) {
      return {
        id: `${user}_unusual_time_${Date.now()}`,
        title: 'Off-Hours Activity Pattern',
        description: `User ${user} has been active during non-business hours ${nightActivities.length} times`,
        severity: 'medium',
        confidence: 0.75 + (Math.min(nightActivities.length, 6) * 0.025),
        affectedUsers: [user],
        suggestedActions: [
          'Review access patterns and business justification',
          'Implement time-based access restrictions if appropriate',
          'Consider requiring approval for off-hours access',
          'Set up real-time alerts for future off-hours activity',
        ],
        timestamp: new Date().toISOString(),
        category: 'suspicious_timing',
        relatedActivities: nightActivities.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Detect sensitive data access patterns
   */
  private detectSensitiveDataAccess(activities: UserActivity[], user: string): MLRecommendation | null {
    const sensitiveBreaches = activities.filter(activity => {
      if (!activity.policiesBreached) return false;
      
      const policies = activity.policiesBreached;
      return (
        (policies.pii && typeof policies.pii !== 'undefined') ||
        (policies.phi && typeof policies.phi !== 'undefined') ||
        (policies.sensitive && typeof policies.sensitive !== 'undefined') ||
        (policies.financial && typeof policies.financial !== 'undefined')
      );
    });
    
    if (sensitiveBreaches.length >= 1) {
      return {
        id: `${user}_sensitive_data_${Date.now()}`,
        title: 'Sensitive Data Access Alert',
        description: `User ${user} has accessed or transferred sensitive data ${sensitiveBreaches.length} times`,
        severity: 'high',
        confidence: 0.92,
        affectedUsers: [user],
        suggestedActions: [
          'Review data access policies and permissions',
          'Verify business justification for sensitive data access',
          'Implement data loss prevention measures',
          'Consider implementing data access approval workflow',
          'Conduct compliance audit and documenting findings',
        ],
        timestamp: new Date().toISOString(),
        category: 'policy_breach',
        relatedActivities: sensitiveBreaches.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Detect bulk operations (multiple similar actions in short time)
   */
  private detectBulkOperations(activities: UserActivity[], user: string): MLRecommendation | null {
    // Group activities by type
    const activityTypes = new Map<string, UserActivity[]>();
    
    activities.forEach(activity => {
      const type = activity.activity || 'unknown';
      const existingActivities = activityTypes.get(type) || [];
      existingActivities.push(activity);
      activityTypes.set(type, existingActivities);
    });
    
    // Look for bulk operations (many of the same activity in short time)
    let bulkOperationFound = false;
    let bulkActivityType = '';
    let bulkActivities: UserActivity[] = [];
    
    activityTypes.forEach((typeActivities, type) => {
      if (typeActivities.length >= BULK_OPERATIONS_THRESHOLD) {
        // Check if they occurred within a short timeframe (2 hours)
        const sortedActivities = [...typeActivities].sort((a, b) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        
        // Check for consecutive activities within short timeframe
        for (let i = 0; i <= sortedActivities.length - BULK_OPERATIONS_THRESHOLD; i++) {
          const startTime = new Date(sortedActivities[i].timestamp).getTime();
          const endTime = new Date(sortedActivities[i + BULK_OPERATIONS_THRESHOLD - 1].timestamp).getTime();
          
          // If activities occurred within 2 hours of each other
          if ((endTime - startTime) <= (2 * 60 * 60 * 1000)) {
            bulkOperationFound = true;
            bulkActivityType = type;
            bulkActivities = sortedActivities.slice(i, i + BULK_OPERATIONS_THRESHOLD);
            break;
          }
        }
      }
    });
    
    if (bulkOperationFound) {
      return {
        id: `${user}_bulk_operations_${Date.now()}`,
        title: 'Bulk Operations Detected',
        description: `User ${user} performed ${bulkActivities.length} ${bulkActivityType} operations in rapid succession`,
        severity: 'medium',
        confidence: 0.78,
        affectedUsers: [user],
        suggestedActions: [
          'Review activities to confirm they are business-justified',
          'Check for automation scripts or mass-access tools',
          'Consider implementing rate limiting for this type of activity',
          'Set up alerts for similar bulk operations in the future',
        ],
        timestamp: new Date().toISOString(),
        category: 'bulk_operations',
        relatedActivities: bulkActivities.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Detect failed access attempts
   */
  private detectFailedAccessAttempts(activities: UserActivity[], user: string): MLRecommendation | null {
    // Look for activities that indicate failed access attempts
    const failedAccessAttempts = activities.filter(activity => {
      const activityLower = (activity.activity || '').toLowerCase();
      return (
        activityLower.includes('fail') || 
        activityLower.includes('denied') || 
        activityLower.includes('rejected') ||
        activityLower.includes('unauthorized')
      );
    });
    
    if (failedAccessAttempts.length >= CONSECUTIVE_FAILURES_THRESHOLD) {
      return {
        id: `${user}_failed_access_${Date.now()}`,
        title: 'Multiple Failed Access Attempts',
        description: `User ${user} has had ${failedAccessAttempts.length} failed access attempts`,
        severity: 'medium',
        confidence: 0.80,
        affectedUsers: [user],
        suggestedActions: [
          'Verify user identity and credentials',
          'Check for potential credential sharing',
          'Implement account lockout after multiple failures',
          'Review access requirements and adjust permissions if needed',
        ],
        timestamp: new Date().toISOString(),
        category: 'access_violation',
        relatedActivities: failedAccessAttempts.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Detect access from multiple locations in short timeframe
   */
  private detectMultiLocationAccess(activities: UserActivity[], user: string): MLRecommendation | null {
    // Filter activities with location data and sort by timestamp
    const activitiesWithLocation = activities
      .filter(a => a.location)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (activitiesWithLocation.length < 2) {
      return null;
    }
    
    // Check for impossible travel (different locations in short timeframe)
    const suspiciousActivities: UserActivity[] = [];
    
    for (let i = 0; i < activitiesWithLocation.length - 1; i++) {
      const currentActivity = activitiesWithLocation[i];
      const nextActivity = activitiesWithLocation[i + 1];
      
      const currentTime = new Date(currentActivity.timestamp).getTime();
      const nextTime = new Date(nextActivity.timestamp).getTime();
      
      const timeDifferenceHours = (nextTime - currentTime) / (1000 * 60 * 60);
      
      // If locations are different and time difference is less than 4 hours
      if (currentActivity.location !== nextActivity.location && timeDifferenceHours < 4) {
        suspiciousActivities.push(currentActivity);
        suspiciousActivities.push(nextActivity);
      }
    }
    
    if (suspiciousActivities.length >= 2) {
      // Create a set of unique locations from suspicious activities
      const uniqueLocations = new Set<string>();
      suspiciousActivities.forEach(activity => {
        if (activity.location) {
          uniqueLocations.add(activity.location);
        }
      });
      
      // Create a set of unique activity IDs
      const uniqueIds = new Set<string>();
      suspiciousActivities.forEach(activity => {
        uniqueIds.add(activity.id);
      });
      
      return {
        id: `${user}_multi_location_${Date.now()}`,
        title: 'Impossible Travel Pattern Detected',
        description: `User ${user} accessed systems from ${uniqueLocations.size} different locations in an impossibly short timeframe`,
        severity: 'high',
        confidence: 0.88,
        affectedUsers: [user],
        suggestedActions: [
          'Investigate potential account sharing or compromise',
          'Enable geo-fencing for user access',
          'Consider implementing multi-factor authentication',
          'Review VPN and remote access controls',
        ],
        timestamp: new Date().toISOString(),
        category: 'access_violation',
        relatedActivities: Array.from(uniqueIds)
      };
    }
    
    return null;
  }
  
  /**
   * Detect potential data exfiltration
   */
  private detectDataExfiltration(activities: UserActivity[], user: string): MLRecommendation | null {
    // Look for large data transfers, especially to external destinations
    const dataTransfers = activities.filter(activity => {
      const activityLower = (activity.activity || '').toLowerCase();
        
        return (
        activityLower.includes('download') || 
        activityLower.includes('export') ||
        activityLower.includes('transfer') ||
        activityLower.includes('email attachment') ||
        activityLower.includes('upload') ||
        (activity.fileSize !== undefined && activity.fileSize > 0)
        );
      });
      
    // Filter for large transfers or sensitive data
    const suspiciousTransfers = dataTransfers.filter(activity => {
      // Check for large file size
      if (activity.fileSize && activity.fileSize > HIGH_DATA_VOLUME_THRESHOLD) {
        return true;
      }
      
      // Check for sensitive data
      if (activity.policiesBreached && (
        activity.policiesBreached.pii || 
        activity.policiesBreached.phi || 
        activity.policiesBreached.sensitive ||
        activity.policiesBreached.financial
      )) {
        return true;
      }
      
      // Check for external destinations
      if (activity.destination && (
        activity.destination.includes('external') ||
        activity.destination.includes('personal') ||
        activity.destination.includes('gmail') ||
        activity.destination.includes('hotmail') ||
        activity.destination.includes('yahoo')
      )) {
        return true;
      }
      
      return false;
    });
    
    if (suspiciousTransfers.length >= 1) {
      return {
        id: `${user}_data_exfiltration_${Date.now()}`,
        title: 'Potential Data Exfiltration',
        description: `User ${user} has transferred large amounts of data or sensitive information`,
        severity: 'critical',
        confidence: 0.85 + (Math.min(suspiciousTransfers.length, 3) * 0.05),
        affectedUsers: [user],
        suggestedActions: [
          'Immediately review data transfer details and destination',
          'Implement data loss prevention controls',
          'Conduct security investigation to assess impact',
          'Consider temporary suspension of user access',
          'Review and update data transfer policies',
        ],
        timestamp: new Date().toISOString(),
        category: 'data_exfiltration',
        relatedActivities: suspiciousTransfers.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Detect unusual application or system usage
   */
  private detectUnusualApplicationUsage(activities: UserActivity[], user: string): MLRecommendation | null {
    // Group by integration/application
    const integrationUsage = new Map<string, number>();
    
    activities.forEach(activity => {
      const integration = activity.integration || 'unknown';
      const count = integrationUsage.get(integration) || 0;
      integrationUsage.set(integration, count + 1);
    });
    
    // Check user history for unusual application usage
    // This is a simplified version - a real system would compare against historical patterns
    const unusualApplications: string[] = [];
    
    integrationUsage.forEach((count, integration) => {
      // Simple rule: if a rarely used application is suddenly used a lot
      if (count > 5 && activities.length > 10 && (count / activities.length) > 0.3) {
        // In a real system, we'd compare against historical usage patterns
        unusualApplications.push(integration);
      }
    });
    
    if (unusualApplications.length > 0) {
      const relatedActivities = activities
        .filter(a => unusualApplications.includes(a.integration || ''))
        .map(a => a.id);
      
      return {
        id: `${user}_unusual_app_usage_${Date.now()}`,
        title: 'Unusual Application Usage Pattern',
        description: `User ${user} is showing unusual usage patterns for: ${unusualApplications.join(', ')}`,
        severity: 'low',
        confidence: 0.70,
        affectedUsers: [user],
        suggestedActions: [
          'Review user\'s role and application access requirements',
          'Check if user has recently changed roles or responsibilities',
          'Consider application-specific monitoring',
          'Update access controls if applications are not needed',
        ],
        timestamp: new Date().toISOString(),
        category: 'unusual_behavior',
        relatedActivities
      };
    }
    
    return null;
  }
  
  /**
   * Detect potential account sharing
   */
  private detectAccountSharing(activities: UserActivity[], user: string): MLRecommendation | null {
    // Analyze multiple sessions or concurrent access
    if (activities.length < 5) {
      return null;
    }
    
    // Sort by timestamp
    const sortedActivities = [...activities].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    
    // Check for concurrent sessions or rapid location changes
    let possibleSharing = false;
    const relatedActivityIds = new Set<string>();
    
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      
      const currentTime = new Date(current.timestamp).getTime();
      const nextTime = new Date(next.timestamp).getTime();
      
      // If activities are very close in time but from different devices/locations
      if ((nextTime - currentTime) < (5 * 60 * 1000)) { // Within 5 minutes
        if (
          (current.deviceId && next.deviceId && current.deviceId !== next.deviceId) ||
          (current.location && next.location && current.location !== next.location) ||
          (current.integration && next.integration && current.integration !== next.integration)
        ) {
          possibleSharing = true;
          relatedActivityIds.add(current.id);
          relatedActivityIds.add(next.id);
        }
      }
    }
    
    if (possibleSharing) {
      return {
        id: `${user}_account_sharing_${Date.now()}`,
        title: 'Potential Account Sharing Detected',
        description: `User ${user} shows activity patterns consistent with shared credential use`,
        severity: 'medium',
        confidence: 0.75,
        affectedUsers: [user],
        suggestedActions: [
          'Implement multi-factor authentication',
          'Conduct user interview to verify sole account usage',
          'Review and update account sharing policies',
          'Consider session limits or concurrent login restrictions',
        ],
        timestamp: new Date().toISOString(),
        category: 'access_violation',
        relatedActivities: Array.from(relatedActivityIds)
      };
    }
    
    return null;
  }
  
  /**
   * Detect risky behavior sequences
   */
  private detectSequentialRiskyBehavior(activities: UserActivity[], user: string): MLRecommendation | null {
    // Look for specific sequences of activities that indicate risk
    // For example: access sensitive data → download files → delete access logs
    
    // Sort by timestamp
    const sortedActivities = [...activities].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    
    // Simplified pattern detection - in a real system this would be more sophisticated
    const hasAccessedSensitiveData = sortedActivities.some(a => {
      return a.policiesBreached && (
        a.policiesBreached.pii || 
        a.policiesBreached.phi || 
        a.policiesBreached.sensitive
      );
    });
    
    const hasDownloadedFiles = sortedActivities.some(a => {
      const activity = (a.activity || '').toLowerCase();
      return activity.includes('download') || activity.includes('export');
    });
    
    const hasTriedToRemoveEvidence = sortedActivities.some(a => {
      const activity = (a.activity || '').toLowerCase();
      return (
        activity.includes('delet') || 
        activity.includes('remov') || 
        activity.includes('clear') ||
        activity.includes('history') ||
        activity.includes('log')
      );
    });
    
    // If the sequence indicates a risky pattern
    if (hasAccessedSensitiveData && hasDownloadedFiles && hasTriedToRemoveEvidence) {
      return {
        id: `${user}_risk_sequence_${Date.now()}`,
        title: 'High-Risk Activity Sequence Detected',
        description: `User ${user} performed a sequence of activities consistent with data theft: accessing sensitive data, downloading files, and attempting to remove evidence`,
        severity: 'critical',
        confidence: 0.92,
        affectedUsers: [user],
        suggestedActions: [
          'Immediately initiate security investigation',
          'Consider temporary account suspension',
          'Preserve all logs and evidence',
          'Implement enhanced monitoring of user activities',
          'Review data access and potential exfiltration',
        ],
        timestamp: new Date().toISOString(),
        category: 'high_risk_sequence',
        relatedActivities: sortedActivities.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Detect patterns across multiple users
   */
  private detectCrossUserPatterns(activities: UserActivity[]): MLRecommendation[] {
    const recommendations: MLRecommendation[] = [];
    
    // Group users by departments if available
    const departmentMap = new Map<string, string[]>();
    const userActivitiesMap = new Map<string, UserActivity[]>();
    
    // Create user to department mapping and collect user activities
    activities.forEach(activity => {
      const user = activity.username || activity.userId || activity.user || '';
      if (!user) return;
      
      // Add to user activities map
      const userActivities = userActivitiesMap.get(user) || [];
      userActivities.push(activity);
      userActivitiesMap.set(user, userActivities);
      
      // Add to department map if department is available
      if (activity.department) {
        const usersInDept = departmentMap.get(activity.department) || [];
        if (!usersInDept.includes(user)) {
          usersInDept.push(user);
          departmentMap.set(activity.department, usersInDept);
        }
      }
    });
    
    // Check for unusual department-wide behavior
    departmentMap.forEach((users, department) => {
      if (users.length >= 3) {
        // Check if multiple users in the same department have high-risk activities
        const usersWithHighRisk = users.filter(user => {
          const userActivities = userActivitiesMap.get(user) || [];
          return userActivities.some(a => (a.riskScore || 0) > HIGH_RISK_THRESHOLD);
        });
        
        if (usersWithHighRisk.length >= 3) {
          recommendations.push({
            id: `dept_${department}_risk_${Date.now()}`,
            title: 'Department-Wide Risk Pattern',
            description: `${usersWithHighRisk.length} users in ${department} department have high-risk activities`,
            severity: 'high',
            confidence: 0.82,
            affectedUsers: usersWithHighRisk,
            suggestedActions: [
              'Review department security policies and compliance',
              'Conduct department-wide security training',
              'Implement additional monitoring for the department',
              'Audit department-level permissions and access controls',
            ],
            timestamp: new Date().toISOString(),
            category: 'unusual_behavior'
          });
        }
      }
    });
    
    // Check for potential data exfiltration campaign
    const timeWindowMs = 24 * 60 * 60 * 1000; // 24 hours
    const sortedActivities = [...activities].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    
    // Find clusters of sensitive data access across users
    for (let i = 0; i < sortedActivities.length; i++) {
      const activity = sortedActivities[i];
      const activityTime = new Date(activity.timestamp).getTime();
      
      // Check if this is a sensitive data access
      if (!activity.policiesBreached || !(
        activity.policiesBreached.pii || 
        activity.policiesBreached.phi || 
        activity.policiesBreached.sensitive
      )) {
        continue;
      }
      
      // Look for other sensitive data access within time window
      const relatedActivities = [activity.id];
      const affectedUsers = [activity.username || activity.userId || activity.user || ''];
      
      for (let j = i + 1; j < sortedActivities.length; j++) {
        const compareActivity = sortedActivities[j];
        const compareTime = new Date(compareActivity.timestamp).getTime();
        
        // If outside time window, stop checking
        if (compareTime - activityTime > timeWindowMs) {
          break;
        }
        
        // Check if this is also a sensitive data access
        if (compareActivity.policiesBreached && (
          compareActivity.policiesBreached.pii || 
          compareActivity.policiesBreached.phi || 
          compareActivity.policiesBreached.sensitive
        )) {
          relatedActivities.push(compareActivity.id);
          const user = compareActivity.username || compareActivity.userId || compareActivity.user || '';
          if (user && !affectedUsers.includes(user)) {
            affectedUsers.push(user);
          }
        }
      }
      
      // If multiple users involved in sensitive data access in short timeframe
      if (affectedUsers.length >= 3 && relatedActivities.length >= 5) {
        recommendations.push({
          id: `multi_user_sensitive_${Date.now()}`,
          title: 'Coordinated Sensitive Data Access',
          description: `${affectedUsers.length} users accessed sensitive data within a short timeframe`,
          severity: 'high',
          confidence: 0.85,
          affectedUsers,
          suggestedActions: [
            'Investigate potential coordinated data theft',
            'Review business justification for mass sensitive data access',
            'Implement enhanced data loss prevention controls',
            'Consider implementing approval workflow for sensitive data access',
          ],
          timestamp: new Date().toISOString(),
          category: 'data_exfiltration',
          relatedActivities
        });
        
        // Skip ahead to avoid duplicate recommendations
        i = i + relatedActivities.length;
      }
    }
    
    return recommendations;
  }
  
  /**
   * Uses a simple algorithm to detect anomalies in user activities
   * This is a simplified version that doesn't depend on the TensorFlow model
   */
  public detectAnomalies(activities: UserActivity[]): UserActivity[] {
    if (activities.length === 0) {
      return [];
    }
    
    // Use a simple rule-based approach instead of ML for better type safety
    const anomalies: UserActivity[] = [];
    
    // Calculate average risk score
    const totalRiskScore = activities.reduce((sum, activity) => sum + (activity.riskScore || 0), 0);
    const avgRiskScore = totalRiskScore / activities.length;
    
    // Find standard deviation of risk scores
    const squaredDiffs = activities.map(activity => {
      const diff = (activity.riskScore || 0) - avgRiskScore;
      return diff * diff;
    });
    const avgSquaredDiff = squaredDiffs.reduce((sum, squaredDiff) => sum + squaredDiff, 0) / activities.length;
    const stdDeviation = Math.sqrt(avgSquaredDiff);
    
    // Mark activities with risk scores more than 2 standard deviations above the mean as anomalies
    activities.forEach(activity => {
      if ((activity.riskScore || 0) > avgRiskScore + (2 * stdDeviation)) {
        anomalies.push(activity);
      }
    });
    
    // Also check for unusual time patterns
    activities.forEach(activity => {
    let hour = -1;
      
    if (activity.timestamp) {
        hour = new Date(activity.timestamp).getHours();
    } else if (activity.time) {
      const timeParts = activity.time.split(':');
      if (timeParts.length >= 1) {
        hour = parseInt(timeParts[0], 10);
      }
    }
    
      // If activity occurred during unusual hours and isn't already marked as anomaly
      if (hour >= 0 && (hour < 6 || hour > 22) && !anomalies.includes(activity)) {
        anomalies.push(activity);
      }
    });
    
    return anomalies;
  }
  
  /**
   * Extract numerical features from activities for ML processing
   * This is kept for future use but not actively used in the simplified approach
   */
  private extractFeatures(activities: UserActivity[]): number[][] {
    return activities.map(activity => {
      // In a real implementation, this would be more sophisticated
      // and would extract meaningful features for the model
      return [
        activity.riskScore || 0,
        this.getHourFromActivity(activity),
        activity.fileSize || 0,
        activity.dataVolume || 0,
        this.countPolicyBreaches(activity),
        this.getIntegrationTypeCode(activity),
        this.getActivityTypeCode(activity),
        this.getStatusCode(activity),
        activity.isAnomaly ? 1 : 0,
        this.getSeverityCode(activity)
      ];
    });
  }
  
  /**
   * Helper methods for feature extraction
   */
  private getHourFromActivity(activity: UserActivity): number {
    if (activity.timestamp) {
      return new Date(activity.timestamp).getHours();
    } else if (activity.time) {
      const timeParts = activity.time.split(':');
      if (timeParts.length >= 1) {
        return parseInt(timeParts[0], 10);
      }
    }
    return 12; // Default to noon if no time information
  }
  
  private countPolicyBreaches(activity: UserActivity): number {
    if (!activity.policiesBreached) return 0;
    
    let count = 0;
    Object.keys(activity.policiesBreached).forEach(key => {
      const value = activity.policiesBreached[key];
      if (Array.isArray(value)) {
        count += value.length;
      } else if (value) {
        count += 1;
      }
    });
    
    return count;
  }
  
  private getIntegrationTypeCode(activity: UserActivity): number {
    const integration = (activity.integration || '').toLowerCase();
    if (integration.includes('email')) return 1;
    if (integration.includes('cloud')) return 2;
    if (integration.includes('usb')) return 3;
    if (integration.includes('app')) return 4;
    return 0;
  }
  
  private getActivityTypeCode(activity: UserActivity): number {
    const activityType = (activity.activity || '').toLowerCase();
    if (activityType.includes('download')) return 1;
    if (activityType.includes('upload')) return 2;
    if (activityType.includes('access')) return 3;
    if (activityType.includes('login')) return 4;
    if (activityType.includes('fail')) return 5;
    return 0;
  }
  
  private getStatusCode(activity: UserActivity): number {
    const status = (activity.status || '').toLowerCase();
    if (status.includes('review')) return 1;
    if (status.includes('trust')) return 2;
    if (status.includes('concern')) return 3;
    if (status.includes('non')) return 4;
    return 0;
  }
  
  private getSeverityCode(activity: UserActivity): number {
    if (!activity.severity) return 0;
    
    switch (activity.severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }
} 