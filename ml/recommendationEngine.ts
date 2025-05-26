"use client";

import { 
  UserActivity, 
  MLRecommendation, 
  RecommendationCategory 
} from '../types/activity';
import { RISK_THRESHOLDS } from '../utils/dataProcessor';
import { AnomalyDetector, AnomalyDetectionResult } from './anomalyDetector';

// Configuration constants
const UNUSUAL_HOUR_START = 22; // 10 PM
const UNUSUAL_HOUR_END = 6; // 6 AM
const CONSECUTIVE_FAILURES_THRESHOLD = 3;

/**
 * Enhanced configuration options for recommendation engine
 */
export interface RecommendationEngineConfig {
  sensitivityLevel?: 'low' | 'medium' | 'high';
  includeAllRecommendations?: boolean;
  confidenceThreshold?: number;
  maxRecommendations?: number;
  useAdvancedAnalysis?: boolean;
  useAnomalyDetection?: boolean;
  criticalHours?: number[];
  temporalBurstMultiplier?: number;
  learnFromManagerActions?: boolean;
}

/**
 * Default configuration for recommendation engine
 */
const DEFAULT_CONFIG: Required<RecommendationEngineConfig> = {
  sensitivityLevel: 'medium',
  includeAllRecommendations: false,
  confidenceThreshold: 0.65,
  maxRecommendations: 10,
  useAdvancedAnalysis: true,
  useAnomalyDetection: true,
  criticalHours: [1, 2, 3],
  temporalBurstMultiplier: 5,
  learnFromManagerActions: true,
};

/**
 * Pattern detection function types
 */
type PatternDetector = (activities: UserActivity[], user: string) => MLRecommendation | null;

/**
 * Enhanced Recommendation Engine with integrated anomaly detection
 */
export class RecommendationEngine {
  private config: Required<RecommendationEngineConfig>;
  private patternDetectors: PatternDetector[];
  private anomalyDetector: AnomalyDetector;
  private isInitialized = false;
  private anomalyResults: Map<string, AnomalyDetectionResult> = new Map();

  constructor(config: RecommendationEngineConfig = {}) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    
    // Initialize anomaly detector with configuration
    this.anomalyDetector = new AnomalyDetector({
      lowThreshold: this.config.sensitivityLevel === 'low' ? 0.5 : 0.6,
      mediumThreshold: this.config.sensitivityLevel === 'low' ? 0.65 : 0.75,
      highThreshold: this.config.sensitivityLevel === 'low' ? 0.8 : 0.9,
      analyzeTemporalBursts: true,
      analyzeIntegrationPatterns: true,
      learnFromManagerActions: this.config.learnFromManagerActions,
      criticalHours: this.config.criticalHours,
      burstMultiplier: this.config.temporalBurstMultiplier,
    });
    
    this.patternDetectors = this.initializePatternDetectors();
  }

  /**
   * Initialize the engine with historical data for baseline learning
   */
  public async initialize(historicalActivities: UserActivity[]): Promise<void> {
    console.log(`Initializing RecommendationEngine with ${historicalActivities.length} historical activities`);
    
    // Build anomaly detection baselines
    if (this.config.useAnomalyDetection) {
      this.anomalyDetector.buildBaselines(historicalActivities);
    }
    
    this.isInitialized = true;
    console.log('RecommendationEngine initialization complete');
  }

  /**
   * Initialize all pattern detectors
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
      this.detectHighVolumeActivity,
      this.detectFrequencyAnomalies,
      this.detectDataVolumeAnomalies,
      this.detectIntegrationAnomalies,
      // NEW: Anomaly-based detectors
      this.detectAnomalyBasedThreats,
      this.detectTemporalBurstPatterns,
    ];
  }

  /**
   * Generate recommendations based on user activities
   */
  public generateRecommendations(activities: UserActivity[]): MLRecommendation[] {
    if (!activities || activities.length === 0) {
      return [];
    }
    
    console.log(`🔍 Starting analysis of ${activities.length} activities`);
    
    // Run anomaly detection first if enabled
    if (this.config.useAnomalyDetection) {
      // Build baselines if not initialized
      if (!this.isInitialized && activities.length >= 100) {
        console.log('Auto-initializing anomaly detector with current activities');
        this.anomalyDetector.buildBaselines(activities);
        this.isInitialized = true;
      }
      
      // Detect anomalies for all activities
      this.anomalyResults = this.anomalyDetector.detectAnomalies(activities);
      const anomalyCount = Array.from(this.anomalyResults.values()).filter(r => r.isAnomaly).length;
      console.log(`🎯 Detected ${anomalyCount} anomalies out of ${activities.length} activities`);
    }
    
    const allRecommendations: MLRecommendation[] = [];
    
    // Check for global temporal burst first
    const globalBurst = this.detectGlobalTemporalBurst(activities);
    if (globalBurst) {
      allRecommendations.push(globalBurst);
    }
    
    // Group activities by user
    const usersMap = new Map<string, UserActivity[]>();
    activities.forEach(activity => {
      const user = activity.username || activity.userId || activity.user || '';
      if (!user) return;
      
      const userActivities = usersMap.get(user) || [];
      userActivities.push(activity);
      usersMap.set(user, userActivities);
    });
    
    console.log(`👥 Found ${usersMap.size} unique users`);
    
    // Run pattern detection for each user
    let detectorResults = new Map<string, number>();
    usersMap.forEach((userActivities, user) => {
      this.patternDetectors.forEach((detector, index) => {
        try {
          const recommendation = detector.call(this, userActivities, user);
          const detectorName = detector.name || `detector_${index}`;
          detectorResults.set(detectorName, (detectorResults.get(detectorName) || 0) + (recommendation ? 1 : 0));
          
          if (recommendation) {
            // Boost confidence with anomaly detection
            if (this.config.useAnomalyDetection) {
              this.boostRecommendationWithAnomalies(recommendation);
            }
            
            // Apply dynamic confidence adjustment
            const activityVolumeBonus = Math.min(userActivities.length / 100, 0.2);
            recommendation.confidence = Math.min(recommendation.confidence + activityVolumeBonus, 1.0);
            
            if (recommendation.confidence >= this.config.confidenceThreshold) {
            allRecommendations.push(recommendation);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Pattern detector error for user ${user}:`, error);
        }
      });
    });
    
    console.log('🎯 Detection Results:', Object.fromEntries(detectorResults));
    console.log(`📊 Generated ${allRecommendations.length} recommendations before filtering`);
    
    // Deduplicate and prioritize
    const deduplicatedRecommendations = this.deduplicateRecommendations(allRecommendations);
    
    // Sort by severity and confidence
    const sortedRecommendations = deduplicatedRecommendations.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
    
    console.log(`✅ Final recommendations: ${sortedRecommendations.length}`);
    
    return sortedRecommendations.slice(0, this.config.maxRecommendations);
  }

  /**
   * NEW: Detect global temporal burst (system-wide anomaly)
   */
  private detectGlobalTemporalBurst(activities: UserActivity[]): MLRecommendation | null {
    const hourlyActivity = new Map<number, UserActivity[]>();
    
    activities.forEach(activity => {
      const hour = this.extractHour(activity);
      if (hour !== null) {
        if (!hourlyActivity.has(hour)) {
          hourlyActivity.set(hour, []);
        }
        hourlyActivity.get(hour)!.push(activity);
      }
    });
    
    const totalActivities = activities.length;
    const expectedPerHour = totalActivities / 24;
    
    // Check critical hours
    const criticalBursts: { hour: number; count: number; multiplier: number }[] = [];
    
    this.config.criticalHours.forEach(hour => {
      const count = hourlyActivity.get(hour)?.length || 0;
      const multiplier = count / expectedPerHour;
      
      if (multiplier >= this.config.temporalBurstMultiplier) {
        criticalBursts.push({ hour, count, multiplier });
      }
    });
    
    if (criticalBursts.length > 0) {
      const totalCriticalActivities = criticalBursts.reduce((sum, b) => sum + b.count, 0);
      const affectedUsers = new Set<string>();
      
      criticalBursts.forEach(({ hour }) => {
        hourlyActivity.get(hour)?.forEach(activity => {
          const user = activity.username || activity.userId || activity.user || '';
          if (user) affectedUsers.add(user);
        });
      });
      
      const criticalHourString = criticalBursts.map(b => `${b.hour}:00`).join(', ');
      const maxMultiplier = Math.max(...criticalBursts.map(b => b.multiplier));
      
      return {
        id: `global_critical_burst_${Date.now()}`,
        title: 'CRITICAL: System-Wide Temporal Anomaly Detected',
        description: `Massive activity spike detected during critical hours (${criticalHourString}). ${totalCriticalActivities} activities (${maxMultiplier.toFixed(1)}x normal) affecting ${affectedUsers.size} users. This matches known attack patterns.`,
        severity: 'critical',
        confidence: 0.99,
        affectedUsers: Array.from(affectedUsers).slice(0, 10),
        suggestedActions: [
          'IMMEDIATE ACTION REQUIRED: Potential system-wide security breach',
          'Activate incident response team',
          'Review all activities during burst period for data exfiltration',
          'Check for compromised service accounts or automated attacks',
          'Consider temporary system-wide security measures',
        ],
        timestamp: new Date().toISOString(),
        category: 'critical_anomaly' as RecommendationCategory,
        relatedActivities: criticalBursts.flatMap(({ hour }) => 
          (hourlyActivity.get(hour) || []).map(a => a.id).slice(0, 20)
        ),
      };
    }
    
    return null;
  }

  /**
   * NEW: Detect patterns based on anomaly scores
   */
  private detectAnomalyBasedThreats(activities: UserActivity[], user: string): MLRecommendation | null {
    if (!this.config.useAnomalyDetection || this.anomalyResults.size === 0) {
      return null;
    }
    
    const criticalAnomalies: { activity: UserActivity; result: AnomalyDetectionResult }[] = [];
    const highAnomalies: { activity: UserActivity; result: AnomalyDetectionResult }[] = [];
    
    activities.forEach(activity => {
      if (!activity.id) return;
      const anomalyResult = this.anomalyResults.get(activity.id);
      if (anomalyResult && anomalyResult.isAnomaly) {
        if (anomalyResult.severity === 'critical') {
          criticalAnomalies.push({ activity, result: anomalyResult });
        } else if (anomalyResult.severity === 'high') {
          highAnomalies.push({ activity, result: anomalyResult });
        }
      }
    });
    
    // Generate recommendation for critical anomalies
    if (criticalAnomalies.length > 0) {
      const factors = new Set<string>();
      const suggestedActions = new Set<string>();
      
      criticalAnomalies.forEach(({ result }) => {
        result.factors.forEach(f => factors.add(f));
        if (result.suggestedAction) {
          suggestedActions.add(result.suggestedAction);
        }
      });
      
      return {
        id: `${user}_critical_anomalies_${Date.now()}`,
        title: `Critical Security Anomalies: ${user}`,
        description: `${criticalAnomalies.length} critical anomalies detected. Key factors: ${Array.from(factors).slice(0, 3).join('; ')}`,
        severity: 'critical',
        confidence: Math.max(...criticalAnomalies.map(({ result }) => result.confidence)),
        affectedUsers: [user],
        suggestedActions: [
          ...Array.from(suggestedActions),
          'Conduct immediate security review',
          'Consider temporary access suspension',
        ].slice(0, 4),
        timestamp: new Date().toISOString(),
        category: 'critical_anomaly' as RecommendationCategory,
        relatedActivities: criticalAnomalies.map(({ activity }) => activity.id),
      };
    }
    
    // Generate recommendation for multiple high anomalies
    if (highAnomalies.length >= 3) {
      const factors = new Set<string>();
      highAnomalies.forEach(({ result }) => {
        result.factors.forEach(f => factors.add(f));
      });
      
      return {
        id: `${user}_high_anomalies_${Date.now()}`,
        title: `Multiple Anomalies Detected: ${user}`,
        description: `${highAnomalies.length} high-severity anomalies detected. Common factors: ${Array.from(factors).slice(0, 2).join('; ')}`,
        severity: 'high',
        confidence: 0.88,
        affectedUsers: [user],
        suggestedActions: [
          'Review user activity history',
          'Verify recent behavior changes',
          'Consider enhanced monitoring',
        ],
        timestamp: new Date().toISOString(),
        category: 'unusual_behavior',
        relatedActivities: highAnomalies.map(({ activity }) => activity.id),
      };
    }
    
    return null;
  }

  /**
   * NEW: Detect temporal burst patterns for individual users
   */
  private detectTemporalBurstPatterns(activities: UserActivity[], user: string): MLRecommendation | null {
    const hourlyActivity = new Map<number, UserActivity[]>();
    
    activities.forEach(activity => {
      const hour = this.extractHour(activity);
      if (hour !== null) {
        if (!hourlyActivity.has(hour)) {
          hourlyActivity.set(hour, []);
        }
        hourlyActivity.get(hour)!.push(activity);
      }
    });
    
    const avgPerHour = activities.length / 24;
    const burstHours: number[] = [];
    const burstActivities: UserActivity[] = [];
    
    hourlyActivity.forEach((hourActivities, hour) => {
      const multiplier = hourActivities.length / avgPerHour;
      if (multiplier >= this.config.temporalBurstMultiplier) {
        burstHours.push(hour);
        burstActivities.push(...hourActivities);
      }
    });
    
    const criticalBurstHours = burstHours.filter(h => this.config.criticalHours.includes(h));
    
    if (criticalBurstHours.length > 0) {
      const criticalActivities = activities.filter(a => {
        const hour = this.extractHour(a);
        return hour !== null && criticalBurstHours.includes(hour);
      });
      
      return {
        id: `${user}_critical_burst_${Date.now()}`,
        title: `Critical Temporal Burst: ${user}`,
        description: `User ${user} has excessive activity during critical hours ${criticalBurstHours.join(', ')}:00. ${criticalActivities.length} activities detected, which is ${(criticalActivities.length / avgPerHour).toFixed(1)}x normal volume`,
        severity: 'critical',
        confidence: 0.95,
        affectedUsers: [user],
        suggestedActions: [
          'Immediate investigation required - possible automated attack or data exfiltration',
          'Check if account has been compromised',
          'Review all activities during burst period for malicious patterns',
          'Consider suspending account access until investigation complete',
        ],
        timestamp: new Date().toISOString(),
        category: 'temporal_burst' as RecommendationCategory,
        relatedActivities: criticalActivities.map(a => a.id),
      };
    }
    
    return null;
  }

  /**
   * Helper method to boost recommendation confidence based on anomaly detection
   */
  private boostRecommendationWithAnomalies(
    recommendation: MLRecommendation
  ): void {
    if (!recommendation.relatedActivities) return;
    
    let anomalyCount = 0;
    let maxAnomalyScore = 0;
    let criticalCount = 0;
    
    recommendation.relatedActivities.forEach(activityId => {
      const anomalyResult = this.anomalyResults.get(activityId);
      if (anomalyResult && anomalyResult.isAnomaly) {
        anomalyCount++;
        maxAnomalyScore = Math.max(maxAnomalyScore, anomalyResult.anomalyScore);
        if (anomalyResult.severity === 'critical') {
          criticalCount++;
        }
      }
    });
    
    if (anomalyCount > 0) {
      const anomalyRatio = anomalyCount / recommendation.relatedActivities.length;
      
      // Boost confidence based on anomaly detection agreement
      const boost = Math.min(0.15, anomalyRatio * 0.2 * maxAnomalyScore);
      recommendation.confidence = Math.min(0.99, recommendation.confidence + boost);
      
      // Upgrade severity if many anomalies or critical anomalies
      if (criticalCount > 0 && recommendation.severity !== 'critical') {
        recommendation.severity = 'high';
      } else if (anomalyRatio > 0.5 && recommendation.severity === 'medium') {
        recommendation.severity = 'high';
      }
    }
  }

  /**
   * Deduplicate recommendations
   */
  private deduplicateRecommendations(recommendations: MLRecommendation[]): MLRecommendation[] {
    const seen = new Map<string, MLRecommendation>();
    
    recommendations.forEach(rec => {
      const key = `${rec.affectedUsers.sort().join(',')}_${rec.category}`;
      
      if (!seen.has(key)) {
        seen.set(key, rec);
      } else {
        const existing = seen.get(key)!;
        
        if (rec.confidence > existing.confidence || 
            (rec.severity === 'critical' && existing.severity !== 'critical')) {
          seen.set(key, rec);
        } else {
          existing.relatedActivities = [
            ...new Set([
              ...(existing.relatedActivities || []),
              ...(rec.relatedActivities || [])
            ])
          ];
        }
      }
    });
    
    return Array.from(seen.values());
  }

  /**
   * Helper method to extract hour from activity
   */
  private extractHour(activity: UserActivity): number | null {
    if (activity.hour !== undefined && activity.hour !== null) {
      return activity.hour;
    }
    
    if (activity.timestamp) {
      try {
        return new Date(activity.timestamp).getHours();
      } catch (e) {
        // Invalid timestamp
      }
    }
    
    if (activity.time) {
      const match = /(\d{1,2})[:h]/i.exec(activity.time);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    return null;
  }

  // Keep all existing pattern detectors
  private detectActivityPatterns(activities: UserActivity[], user: string): MLRecommendation | null {
    const moderateRiskActivities = activities.filter(a => a.riskScore && a.riskScore > 40);
    const highRiskActivities = activities.filter(a => a.riskScore && a.riskScore > RISK_THRESHOLDS.HIGH);
    
    if (highRiskActivities.length >= 1) {
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
    } else if (moderateRiskActivities.length >= 3) {
      return {
        id: `${user}_moderate_risk_${Date.now()}`,
        title: 'Moderate Risk Activity Pattern',
        description: `User ${user} has performed ${moderateRiskActivities.length} activities with elevated risk scores`,
        severity: 'medium',
        confidence: 0.65,
        affectedUsers: [user],
        suggestedActions: [
          'Monitor user activity patterns',
          'Review recent access patterns',
          'Consider risk assessment interview',
        ],
        timestamp: new Date().toISOString(),
        category: 'unusual_behavior',
        relatedActivities: moderateRiskActivities.slice(0, 10).map(a => a.id)
      };
    }
    
    return null;
  }
  
  private detectUnusualTimePatterns(activities: UserActivity[], user: string): MLRecommendation | null {
    const nightActivities = activities.filter(activity => {
      const hour = this.extractHour(activity);
      if (hour === null) return false;
      
      const isOffHour = hour >= UNUSUAL_HOUR_START || hour < UNUSUAL_HOUR_END;
      const isCriticalHour = this.config.criticalHours.includes(hour);
      
      // Check anomaly score if available
      let hasTimeAnomaly = false;
      if (activity.id && this.anomalyResults.has(activity.id)) {
        const anomalyResult = this.anomalyResults.get(activity.id)!;
        hasTimeAnomaly = anomalyResult.isAnomaly && 
          anomalyResult.factors.some(f => f.toLowerCase().includes('time') || f.toLowerCase().includes('hour'));
      }
      
      return isOffHour || isCriticalHour || hasTimeAnomaly;
    });
    
    if (nightActivities.length >= 1) {
      const criticalHourActivities = nightActivities.filter(a => {
        const hour = this.extractHour(a);
        return hour !== null && this.config.criticalHours.includes(hour);
      });
      
      const severity = criticalHourActivities.length > 0 ? 'high' : 
                      nightActivities.length >= 5 ? 'high' : 'medium';
      
      return {
        id: `${user}_unusual_time_${Date.now()}`,
        title: criticalHourActivities.length > 0 ? 
          `Critical Hours Activity: ${user}` : 
          `Off-Hours Activity Pattern: ${user}`,
        description: criticalHourActivities.length > 0 ?
          `User ${user} has ${criticalHourActivities.length} activities during critical monitoring hours (1-3 AM)` :
          `User ${user} has been active during non-business hours ${nightActivities.length} times`,
        severity,
        confidence: criticalHourActivities.length > 0 ? 0.90 : 0.70 + (nightActivities.length * 0.05),
        affectedUsers: [user],
        suggestedActions: criticalHourActivities.length > 0 ? [
          'Investigate immediately - activity during known attack hours',
          'Check for automated/scripted behavior',
          'Review account for compromise indicators',
        ] : [
          'Review access patterns and business justification',
          'Consider requiring approval for off-hours access',
          'Set up real-time alerts for future off-hours activity',
        ],
        timestamp: new Date().toISOString(),
        category: 'suspicious_timing',
        relatedActivities: nightActivities.map(a => a.id),
      };
    }
    
    return null;
  }
  
  private detectSensitiveDataAccess(activities: UserActivity[], user: string): MLRecommendation | null {
    const sensitiveBreaches = activities.filter(activity => {
      if (!activity.policiesBreached) return false;
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
  
  private detectFailedAccessAttempts(activities: UserActivity[], user: string): MLRecommendation | null {
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
  
  private detectMultiLocationAccess(activities: UserActivity[], user: string): MLRecommendation | null {
    const activitiesWithLocation = activities
      .filter(a => a.location && a.timestamp)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
    
    if (activitiesWithLocation.length < 2) {
      return null;
    }
    
    const suspiciousActivities: UserActivity[] = [];
    
    for (let i = 0; i < activitiesWithLocation.length - 1; i++) {
      const currentActivity = activitiesWithLocation[i];
      const nextActivity = activitiesWithLocation[i + 1];
      
      const currentTime = new Date(currentActivity.timestamp!).getTime();
      const nextTime = new Date(nextActivity.timestamp!).getTime();
      
      const timeDifferenceHours = (nextTime - currentTime) / (1000 * 60 * 60);
      
      if (currentActivity.location !== nextActivity.location && timeDifferenceHours < 4) {
        suspiciousActivities.push(currentActivity);
        suspiciousActivities.push(nextActivity);
      }
    }
    
    if (suspiciousActivities.length >= 2) {
      const uniqueLocations = new Set<string>();
      suspiciousActivities.forEach(activity => {
        if (activity.location) {
          uniqueLocations.add(activity.location);
        }
      });
      
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
  
  private detectUnusualApplicationUsage(activities: UserActivity[], user: string): MLRecommendation | null {
    const integrationUsage = new Map<string, number>();
    
    activities.forEach(activity => {
      const integration = activity.integration || 'unknown';
      const count = integrationUsage.get(integration) || 0;
      integrationUsage.set(integration, count + 1);
    });
    
    const unusualApplications: string[] = [];
    
    integrationUsage.forEach((count, integration) => {
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
  
  private detectAccountSharing(activities: UserActivity[], user: string): MLRecommendation | null {
    if (activities.length < 5) {
      return null;
    }
    
    const sortedActivities = activities
      .filter(a => a.timestamp)
      .sort((a, b) => {
        return new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime();
      });
    
    let possibleSharing = false;
    const relatedActivityIds = new Set<string>();
    
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      
      const currentTime = new Date(current.timestamp!).getTime();
      const nextTime = new Date(next.timestamp!).getTime();
      
      if ((nextTime - currentTime) < (5 * 60 * 1000)) {
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
  
  private detectSequentialBehavior(activities: UserActivity[], user: string): MLRecommendation | null {
    const sortedActivities = activities
      .filter(a => a.timestamp)
      .sort((a, b) => {
        return new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime();
      });
    
    const hasAccessedSensitiveData = sortedActivities.some(a => {
      return a.policiesBreached && Object.keys(a.policiesBreached).length > 0;
    });
    
    const hasDownloadedFiles = sortedActivities.some(a => {
      const activity = (a.activity || '').toLowerCase();
      return activity.includes('download') || activity.includes('export');
    });
    
    const hasTriedToRemoveEvidence = sortedActivities.some(a => {
      const activity = (a.activity || '').toLowerCase();
      return activity.includes('delete') || activity.includes('remove') || activity.includes('clear');
    });
    
    if (hasAccessedSensitiveData && hasDownloadedFiles && hasTriedToRemoveEvidence) {
      return {
        id: `${user}_suspicious_sequence_${Date.now()}`,
        title: 'Suspicious Activity Sequence Detected',
        description: `User ${user} performed a sequence of activities that may require investigation: accessing sensitive data, downloading files, and attempting to remove evidence`,
        severity: 'high',
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
  
  private detectHighVolumeActivity(activities: UserActivity[], user: string): MLRecommendation | null {
    if (activities.length >= 50) {
      const uniqueDays = new Set(activities.map(a => {
        if (a.timestamp) {
          return new Date(a.timestamp).toDateString();
        }
        return 'unknown';
      })).size;
      
      const avgPerDay = activities.length / (uniqueDays || 1);
      
      if (avgPerDay >= 10) {
        return {
          id: `${user}_high_volume_${Date.now()}`,
          title: 'High Activity Volume Pattern',
          description: `User ${user} has ${activities.length} activities with an average of ${Math.round(avgPerDay)} per day`,
          severity: avgPerDay >= 30 ? 'high' : 'medium',
          confidence: 0.45 + Math.min(avgPerDay / 100, 0.3),
          affectedUsers: [user],
          suggestedActions: [
            'Review if activity level is appropriate for user role',
            'Check for potential automated or bulk operations',
            'Monitor for signs of account compromise',
          ],
          timestamp: new Date().toISOString(),
          category: 'unusual_behavior',
          relatedActivities: activities.slice(0, 20).map(a => a.id)
        };
      }
    }
    return null;
  }

  private detectFrequencyAnomalies(activities: UserActivity[], user: string): MLRecommendation | null {
    if (activities.length < 10) return null;

    const hourlyActivity = new Map<string, UserActivity[]>();
    activities.forEach(activity => {
      if (activity.timestamp) {
        const hourKey = new Date(activity.timestamp).toISOString().slice(0, 13);
        const existing = hourlyActivity.get(hourKey) || [];
        existing.push(activity);
        hourlyActivity.set(hourKey, existing);
      }
    });

    const burstHours = Array.from(hourlyActivity.entries())
      .filter(([_, hourActivities]) => hourActivities.length >= 5)
      .sort((a, b) => b[1].length - a[1].length);

    if (burstHours.length >= 1) {
      const topBurst = burstHours[0];
      return {
        id: `${user}_frequency_burst_${Date.now()}`,
        title: 'Activity Frequency Anomaly',
        description: `User ${user} had ${topBurst[1].length} activities in a single hour, indicating potential automated behavior`,
        severity: topBurst[1].length >= 15 ? 'high' : 'medium',
        confidence: 0.50 + Math.min(topBurst[1].length / 50, 0.3),
        affectedUsers: [user],
        suggestedActions: [
          'Investigate potential automated tools or scripts',
          'Review if burst activity aligns with business processes',
          'Check for signs of malicious automation',
        ],
        timestamp: new Date().toISOString(),
        category: 'unusual_behavior',
        relatedActivities: topBurst[1].map(a => a.id)
      };
    }
    return null;
  }

  private detectDataVolumeAnomalies(activities: UserActivity[], user: string): MLRecommendation | null {
    const activitiesWithData = activities.filter(a => a.dataVolume && a.dataVolume > 0);
    if (activitiesWithData.length === 0) return null;

    const totalDataVolume = activitiesWithData.reduce((sum, a) => sum + (a.dataVolume || 0), 0);
    const maxDataVolume = Math.max(...activitiesWithData.map(a => a.dataVolume || 0));

    if (totalDataVolume >= 1000 || maxDataVolume >= 500) {
      const largeTransfers = activitiesWithData.filter(a => (a.dataVolume || 0) >= 100);
      
      return {
        id: `${user}_data_volume_${Date.now()}`,
        title: 'Large Data Volume Activity',
        description: `User ${user} transferred ${Math.round(totalDataVolume)}MB of data with ${largeTransfers.length} large transfers`,
        severity: totalDataVolume >= 5000 ? 'high' : 'medium',
        confidence: 0.60 + Math.min(totalDataVolume / 10000, 0.25),
        affectedUsers: [user],
        suggestedActions: [
          'Review business justification for large data transfers',
          'Implement data loss prevention monitoring',
          'Check for potential data exfiltration',
        ],
        timestamp: new Date().toISOString(),
        category: 'data_exfiltration',
        relatedActivities: largeTransfers.map(a => a.id)
      };
    }
    return null;
  }

  private detectIntegrationAnomalies(activities: UserActivity[], user: string): MLRecommendation | null {
    if (activities.length < 5) return null;

    const integrationCounts = new Map<string, number>();
    activities.forEach(activity => {
      const integration = activity.integration || 'unknown';
      integrationCounts.set(integration, (integrationCounts.get(integration) || 0) + 1);
    });

    const uniqueIntegrations = integrationCounts.size;
    const mostUsed = Array.from(integrationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (uniqueIntegrations >= 5 || (mostUsed[0] && mostUsed[0][1] >= activities.length * 0.7)) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      let description = '';
      
      if (uniqueIntegrations >= 10) {
        severity = 'medium';
        description = `User ${user} accessed ${uniqueIntegrations} different integrations, indicating broad system access`;
      } else if (mostUsed[0] && mostUsed[0][1] >= activities.length * 0.8) {
        severity = 'medium';
        description = `User ${user} shows heavy usage of ${mostUsed[0][0]} (${mostUsed[0][1]} activities)`;
      } else {
        description = `User ${user} shows diverse integration usage across ${uniqueIntegrations} systems`;
      }

      return {
        id: `${user}_integration_anomaly_${Date.now()}`,
        title: 'Integration Usage Pattern',
        description,
        severity,
        confidence: 0.45 + Math.min(uniqueIntegrations / 20, 0.25),
        affectedUsers: [user],
        suggestedActions: [
          'Review user\'s authorized system access',
          'Verify business need for broad integration access',
          'Consider principle of least privilege review',
        ],
        timestamp: new Date().toISOString(),
        category: 'access_violation',
        relatedActivities: activities.slice(0, 15).map(a => a.id)
      };
    }
    return null;
  }
} 