"use client";

import * as tf from '@tensorflow/tfjs';
import { 
  UserActivity, 
  MLRecommendation, 
  RecommendationCategory 
} from '../types/activity';
import { RISK_THRESHOLDS } from '../utils/dataProcessor';

// Remove risk threshold constants since we shouldn't calculate risk scores
const UNUSUAL_HOUR_START = 22; // 10 PM
const UNUSUAL_HOUR_END = 6; // 6 AM
const CONSECUTIVE_FAILURES_THRESHOLD = 3;
const BULK_OPERATIONS_THRESHOLD = 5;
const HIGH_DATA_VOLUME_THRESHOLD = 50; // MB

/**
 * Configuration options for recommendation engine
 */
export interface RecommendationEngineConfig {
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
  private config: Required<RecommendationEngineConfig>;
  private patternDetectors: PatternDetector[];
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  /**
   * Creates a new recommendation engine instance
   * @param config Configuration options
   */
  constructor(config: RecommendationEngineConfig = DEFAULT_CONFIG) {
    // Set defaults for required config
    this.config = {
      sensitivityLevel: config.sensitivityLevel || 'medium',
      confidenceThreshold: config.confidenceThreshold || 0.65,
      maxRecommendations: config.maxRecommendations || 10,
      useAdvancedAnalysis: config.useAdvancedAnalysis || false,
      includeAllRecommendations: config.includeAllRecommendations || false
    };
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
      this.detectActivityPatterns,
      this.detectUnusualTimePatterns,
      this.detectSensitiveDataAccess,
      this.detectFailedAccessAttempts,
      this.detectMultiLocationAccess,
      this.detectUnusualApplicationUsage,
      this.detectAccountSharing,
      this.detectSequentialBehavior,
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
    
    const allRecommendations: MLRecommendation[] = [];
    
    // Group activities by user
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
        try {
          const recommendation = detector.call(this, userActivities, user);
          if (recommendation && 
              recommendation.confidence >= this.config.confidenceThreshold) {
            allRecommendations.push(recommendation);
          }
        } catch (error) {
          console.warn(`Pattern detector error for user ${user}:`, error);
        }
      });
    });
    
    // Only run advanced analysis if enabled
    if (this.config.useAdvancedAnalysis) {
      console.log('Running advanced ML analysis');
      // Add more advanced pattern detection here
    }
    
    // Sort by confidence and limit to maximum number
    const filteredRecommendations = allRecommendations
      .filter(rec => rec.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
    
    // Limit to maximum number
    return filteredRecommendations.slice(0, this.config.maxRecommendations);
  }

  /**
   * Detect when a user has multiple high-risk activities based on their existing risk score
   */
  private detectActivityPatterns(activities: UserActivity[], user: string): MLRecommendation | null {
    // Filter for activities that already have high risk scores in the input data
    const highRiskActivities = activities.filter(a => a.riskScore && a.riskScore > RISK_THRESHOLDS.HIGH);
    
    if (highRiskActivities.length >= 2) {
      return {
        id: `${user}_high_risk_${Date.now()}`,
        title: 'Critical Risk Activity Pattern',
        description: `User ${user} has performed ${highRiskActivities.length} high-risk activities that require attention`,
        severity: 'high',
        confidence: 0.85,
        affectedUsers: [user],
        suggestedActions: [
          'Review user access permissions',
          'Implement additional monitoring for this user',
          'Consider security awareness training',
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
        confidence: 0.75,
        affectedUsers: [user],
        suggestedActions: [
          'Review access patterns and business justification',
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
   * Detect sensitive data access patterns from existing policy breach flags
   */
  private detectSensitiveDataAccess(activities: UserActivity[], user: string): MLRecommendation | null {
    const sensitiveBreaches = activities.filter(activity => {
      if (!activity.policiesBreached) return false;
      
      // Use existing policy breach data
      return Object.keys(activity.policiesBreached).length > 0;
    });
    
    if (sensitiveBreaches.length >= 1) {
      return {
        id: `${user}_sensitive_data_${Date.now()}`,
        title: 'Sensitive Data Access Alert',
        description: `User ${user} has accessed sensitive data ${sensitiveBreaches.length} times according to policy flags`,
        severity: 'high',
        confidence: 0.92,
        affectedUsers: [user],
        suggestedActions: [
          'Review data access policies and permissions',
          'Verify business justification for sensitive data access',
          'Implement data loss prevention measures',
        ],
        timestamp: new Date().toISOString(),
        category: 'policy_breach',
        relatedActivities: sensitiveBreaches.map(a => a.id)
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
        ],
        timestamp: new Date().toISOString(),
        category: 'access_violation',
        relatedActivities: Array.from(uniqueIds)
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
    
    // Check for unusual application usage patterns
    const unusualApplications: string[] = [];
    
    integrationUsage.forEach((count, integration) => {
      // Simple rule: if a rarely used application is suddenly used a lot
      if (count > 5 && activities.length > 10 && (count / activities.length) > 0.3) {
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
      return new Date(a.timestamp || new Date().toISOString()).getTime() - new Date(b.timestamp || new Date().toISOString()).getTime();
    });
    
    // Check for concurrent sessions or rapid location changes
    let possibleSharing = false;
    const relatedActivityIds = new Set<string>();
    
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      
      const currentTime = new Date(current.timestamp || new Date().toISOString()).getTime();
      const nextTime = new Date(next.timestamp || new Date().toISOString()).getTime();
      
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
        ],
        timestamp: new Date().toISOString(),
        category: 'access_violation',
        relatedActivities: Array.from(relatedActivityIds)
      };
    }
    
    return null;
  }
  
  /**
   * Detect behavior sequences without calculating risk scores
   */
  private detectSequentialBehavior(activities: UserActivity[], user: string): MLRecommendation | null {
    // Look for specific sequences of activities that indicate suspicious behavior
    // For example: access sensitive data → download files → delete access logs
    
    // Sort by timestamp
    const sortedActivities = [...activities].sort((a, b) => {
      return new Date(a.timestamp || new Date().toISOString()).getTime() - new Date(b.timestamp || new Date().toISOString()).getTime();
    });
    
    // Simplified pattern detection - in a real system this would be more sophisticated
    const hasAccessedSensitiveData = sortedActivities.some(a => {
      return a.policiesBreached && Object.keys(a.policiesBreached).length > 0;
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
    
    // If the sequence indicates a suspicious pattern
    if (hasAccessedSensitiveData && hasDownloadedFiles && hasTriedToRemoveEvidence) {
      return {
        id: `${user}_suspicious_sequence_${Date.now()}`,
        title: 'Suspicious Activity Sequence Detected',
        description: `User ${user} performed a sequence of activities that may require investigation: accessing sensitive data, downloading files, and attempting to remove evidence`,
        severity: 'critical',
        confidence: 0.92,
        affectedUsers: [user],
        suggestedActions: [
          'Initiate security investigation',
          'Preserve all logs and evidence',
          'Implement enhanced monitoring of user activities',
        ],
        timestamp: new Date().toISOString(),
        category: 'high_risk_sequence',
        relatedActivities: sortedActivities.map(a => a.id)
      };
    }
    
    return null;
  }
  
  /**
   * Extract features for activity patterns without calculating risk
   */
  private extractFeatures(activities: UserActivity[]): any[][] {
    return activities.map(activity => {
      // Extract existing features without calculating risk
      return [
        activity.timestamp ? new Date(activity.timestamp).getHours() : 12,
        activity.activity ? 1 : 0,
        activity.integration ? 1 : 0,
        activity.location ? 1 : 0,
        activity.policiesBreached ? Object.keys(activity.policiesBreached).length : 0
      ];
    });
  }
} 