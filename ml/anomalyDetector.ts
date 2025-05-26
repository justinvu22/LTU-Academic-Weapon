import { UserActivity } from '../types/activity';

/**
 * Configuration options for the anomaly detector
 */
export interface AnomalyDetectorConfig {
  // Thresholds
  lowThreshold: number;  
  mediumThreshold: number; 
  highThreshold: number;
  
  // Features to analyze
  analyzeTimePatterns: boolean;
  analyzeDataVolume: boolean;  
  analyzeUserBehavior: boolean;
  analyzeActivitySequences: boolean;
  analyzeTemporalBursts: boolean; // NEW
  analyzeIntegrationPatterns: boolean; // NEW
  
  // Status weighting
  trustTrustedActivities: boolean;
  concernWeight: number;
  
  // Manager action learning - NEW
  learnFromManagerActions: boolean;
  managerActionWeight: number;
  
  // Advanced options
  adaptiveThreshold: boolean;
  minimumBaselineSize: number;
  
  // Temporal burst detection - NEW
  burstWindowMinutes: number;
  burstMultiplier: number;
  criticalHours: number[];
}

/**
 * Enhanced anomaly detection results
 */
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  anomalyType?: string;
  confidence: number;
  factors: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical'; // NEW
  relatedActivities?: string[];
  suggestedAction?: string; // NEW
}

/**
 * Enhanced Anomaly Detection System
 */
export class AnomalyDetector {
  private config: AnomalyDetectorConfig;
  private userBaselines: Map<string, UserBaseline> = new Map();
  private globalBaseline: GlobalBaseline;
  private managerActionPatterns: Map<string, ManagerActionPattern> = new Map();
  private temporalBurstHistory: Map<number, BurstInfo> = new Map();
  
  constructor(config?: Partial<AnomalyDetectorConfig>) {
    this.config = {
      lowThreshold: 0.6,
      mediumThreshold: 0.75,
      highThreshold: 0.9,
      analyzeTimePatterns: true,
      analyzeDataVolume: true,
      analyzeUserBehavior: true,
      analyzeActivitySequences: true,
      analyzeTemporalBursts: true,
      analyzeIntegrationPatterns: true,
      trustTrustedActivities: true,
      concernWeight: 2.0,
      learnFromManagerActions: true,
      managerActionWeight: 1.5,
      adaptiveThreshold: true,
      minimumBaselineSize: 10,
      burstWindowMinutes: 60,
      burstMultiplier: 5,
      criticalHours: [1, 2, 3],
      ...config
    };
    
    this.globalBaseline = {
      timeOfDayDistribution: Array(24).fill(0),
      activityTypeFrequency: {},
      integrationDistribution: {},
      dataVolumeStats: { mean: 0, stdDev: 0, samples: [] },
      totalActivities: 0,
      hourlyVolumeStats: Array(24).fill(null).map(() => ({
        mean: 0,
        stdDev: 0,
        max: 0,
        samples: []
      }))
    };
  }
  
  /**
   * Enhanced baseline building with manager action learning
   */
  public buildBaselines(activities: UserActivity[]): void {
    if (!activities || activities.length === 0) {
      console.log("Warning: No activities provided to build baselines");
      return;
    }
    
    const sanitizedActivities = this.sanitizeActivities(activities);
    console.log(`Building enhanced baselines with ${sanitizedActivities.length} activities`);
    
    this.resetBaselines();
    
    // First pass: collect all data points
    sanitizedActivities.forEach(activity => {
      this.updateGlobalBaseline(activity);
      this.updateUserBaseline(activity);
      
      if (this.config.learnFromManagerActions && activity.managerAction) {
        this.updateManagerActionPatterns(activity);
      }
    });
    
    // Second pass: calculate statistics
    this.finalizeBaselines();
    
    // Detect temporal burst patterns
    if (this.config.analyzeTemporalBursts) {
      this.detectTemporalBurstPatterns(sanitizedActivities);
    }
    
    console.log(`Built baselines: ${this.userBaselines.size} users, ${this.managerActionPatterns.size} manager patterns`);
    console.log(`Detected ${this.temporalBurstHistory.size} temporal burst patterns`);
  }
  
  /**
   * Detect anomalies in a batch of activities
   */
  public detectAnomalies(activities: UserActivity[]): Map<string, AnomalyDetectionResult> {
    const results = new Map<string, AnomalyDetectionResult>();
    
    activities.forEach(activity => {
      const result = this.detectAnomaly(activity);
      if (activity.id) {
        results.set(activity.id, result);
      }
    });
    
    return results;
  }
  
  /**
   * Enhanced anomaly detection with all features
   */
  public detectAnomaly(activity: UserActivity): AnomalyDetectionResult {
    if (!activity) {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        confidence: 0,
        factors: ['Activity data missing']
      };
    }
    
    // Check for critical anomalies even in trusted activities
    if (this.config.trustTrustedActivities && activity.status === 'trusted') {
      const criticalCheck = this.checkCriticalAnomalies(activity);
      if (!criticalCheck.isCritical) {
        return {
          isAnomaly: false,
          anomalyScore: 0,
          confidence: 0.95,
          factors: ['Activity is explicitly trusted']
        };
      }
    }
    
    const factors: string[] = [];
    const scores: { [key: string]: number } = {};
    
    // Base score from status
    let baseScore = 0;
    if (activity.status === 'concern') {
      baseScore = 0.3 * this.config.concernWeight;
      factors.push('Status: concern');
    } else if (activity.status === 'underReview') {
      baseScore = 0.1;
      factors.push('Status: under review');
    }
    
    // 1. Enhanced time pattern analysis
    if (this.config.analyzeTimePatterns) {
      const timeResult = this.detectEnhancedTimeAnomaly(activity);
      if (timeResult.score > 0) {
        scores.time = timeResult.score;
        factors.push(...timeResult.factors);
      }
    }
    
    // 2. Temporal burst detection
    if (this.config.analyzeTemporalBursts) {
      const burstResult = this.detectTemporalBurst(activity);
      if (burstResult.score > 0) {
        scores.burst = burstResult.score;
        factors.push(...burstResult.factors);
      }
    }
    
    // 3. Data volume anomaly
    if (this.config.analyzeDataVolume) {
      const volumeScore = this.detectVolumeAnomaly(activity);
      if (volumeScore > 0) {
        scores.volume = volumeScore;
        factors.push(`Unusual data volume (z-score: ${volumeScore.toFixed(2)})`);
      }
    }
    
    // 4. User behavior anomaly
    if (this.config.analyzeUserBehavior) {
      const behaviorScore = this.detectBehaviorAnomaly(activity);
      if (behaviorScore > 0) {
        scores.behavior = behaviorScore;
        factors.push(`Unusual user behavior (score: ${behaviorScore.toFixed(2)})`);
      }
    }
    
    // 5. Integration-specific anomaly
    if (this.config.analyzeIntegrationPatterns) {
      const integrationResult = this.detectIntegrationAnomaly(activity);
      if (integrationResult.score > 0) {
        scores.integration = integrationResult.score;
        factors.push(...integrationResult.factors);
      }
    }
    
    // Calculate weighted score
    const anomalyScore = this.calculateWeightedScore(baseScore, scores);
    const severity = this.calculateSeverity(anomalyScore, factors);
    const threshold = this.getAdaptiveThreshold(activity);
    const confidence = this.calculateConfidence(anomalyScore, threshold, factors);
    const suggestedAction = this.getSuggestedAction(activity);
    
    return {
      isAnomaly: anomalyScore >= threshold,
      anomalyScore: Math.min(1.0, anomalyScore),
      anomalyType: this.determineAnomalyType(factors),
      confidence,
      factors,
      severity,
      suggestedAction
    };
  }
  
  /**
   * Enhanced time anomaly detection
   */
  private detectEnhancedTimeAnomaly(activity: UserActivity): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;
    
    const hour = this.extractHour(activity);
    if (hour === null) return { score: 0, factors: [] };
    
    // Critical hour check (1-3 AM)
    if (this.config.criticalHours.includes(hour)) {
      score += 0.3;
      factors.push(`Activity during critical hour: ${hour}:00`);
    }
    
    // User pattern check
    if (activity.user) {
      const userBaseline = this.userBaselines.get(activity.user);
      if (userBaseline && userBaseline.totalActivities >= this.config.minimumBaselineSize) {
        const userHourlyRate = userBaseline.timeOfDayDistribution[hour] / userBaseline.totalActivities;
        
        if (userHourlyRate < 0.02) {
          score += 0.4;
          factors.push(`Unusual hour for user (${(userHourlyRate * 100).toFixed(1)}% of their activity)`);
        }
      }
    }
    
    // Global pattern check
    const globalHourlyRate = this.globalBaseline.timeOfDayDistribution[hour] / 
                           Math.max(1, this.globalBaseline.totalActivities);
    const expectedRate = 1 / 24;
    
    if (globalHourlyRate > expectedRate * 3) {
      score += 0.2;
      factors.push(`High-activity hour globally (${(globalHourlyRate * 100).toFixed(1)}% of all activity)`);
    }
    
    return { score: Math.min(1.0, score), factors };
  }
  
  /**
   * Detect temporal bursts
   */
  private detectTemporalBurst(activity: UserActivity): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;
    
    const hour = this.extractHour(activity);
    if (hour === null) return { score: 0, factors: [] };
    
    const burstInfo = this.temporalBurstHistory.get(hour);
    if (!burstInfo) return { score: 0, factors: [] };
    
    if (burstInfo.isBurst) {
      score += 0.5;
      factors.push(`Temporal burst detected at ${hour}:00 (${burstInfo.multiplier.toFixed(1)}x normal)`);
      
      if (this.config.criticalHours.includes(hour)) {
        score += 0.3;
        factors.push('Burst during critical monitoring period');
      }
    }
    
    return { score: Math.min(1.0, score), factors };
  }
  
  /**
   * Detect integration-specific anomalies
   */
  private detectIntegrationAnomaly(activity: UserActivity): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;
    
    if (!activity.integration) return { score: 0, factors: [] };
    
    // USB activities are higher risk
    if (activity.integration.toLowerCase().includes('usb')) {
      score += 0.3;
      factors.push('USB activity detected (higher risk category)');
      
      if (activity.user) {
        const userBaseline = this.userBaselines.get(activity.user);
        if (userBaseline && !userBaseline.integrationFrequency['usb']) {
          score += 0.4;
          factors.push('First USB usage for this user');
        }
      }
    }
    
    // Check for unusual integration for the user
    if (activity.user) {
      const userBaseline = this.userBaselines.get(activity.user);
      if (userBaseline && userBaseline.totalActivities >= this.config.minimumBaselineSize) {
        const integrationRate = (userBaseline.integrationFrequency[activity.integration] || 0) / 
                               userBaseline.totalActivities;
        
        if (integrationRate < 0.05) {
          score += 0.2;
          factors.push(`Unusual integration for user: ${activity.integration}`);
        }
      }
    }
    
    return { score: Math.min(1.0, score), factors };
  }
  
  /**
   * Detect volume-based anomalies
   */
  private detectVolumeAnomaly(activity: UserActivity): number {
    const dataSize = activity.dataVolume || activity.fileSize || 0;
    if (dataSize === 0) return 0;
    
    const { mean, stdDev } = this.globalBaseline.dataVolumeStats;
    
    if (stdDev === 0 || this.globalBaseline.dataVolumeStats.samples.length < 2) return 0;
    
    const zScore = (dataSize - mean) / stdDev;
    
    if (zScore <= 2) return 0;
    
    return Math.min(1, (zScore - 2) / 6);
  }
  
  /**
   * Detect behavior anomalies
   */
  private detectBehaviorAnomaly(activity: UserActivity): number {
    if (!activity.user || !activity.activityType) return 0;
    
    const userBaseline = this.userBaselines.get(activity.user);
    if (!userBaseline || userBaseline.totalActivities < this.config.minimumBaselineSize) {
      return 0;
    }
    
    const userActivityFreq = userBaseline.activityTypeFrequency[activity.activityType] || 0;
    const userActivityScore = 1 - Math.min(1, userActivityFreq / Math.max(1, userBaseline.totalActivities) * 10);
    
    return userActivityScore;
  }
  
  /**
   * Detect temporal burst patterns in historical data
   */
  private detectTemporalBurstPatterns(activities: UserActivity[]): void {
    const hourlyGroups = new Map<number, UserActivity[]>();
    
    activities.forEach(activity => {
      const hour = this.extractHour(activity);
      if (hour !== null) {
        if (!hourlyGroups.has(hour)) {
          hourlyGroups.set(hour, []);
        }
        hourlyGroups.get(hour)!.push(activity);
      }
    });
    
    const avgActivitiesPerHour = activities.length / 24;
    
    hourlyGroups.forEach((hourActivities, hour) => {
      const multiplier = hourActivities.length / avgActivitiesPerHour;
      const isBurst = multiplier >= this.config.burstMultiplier;
      
      this.temporalBurstHistory.set(hour, {
        hour,
        count: hourActivities.length,
        multiplier,
        isBurst,
        isCritical: this.config.criticalHours.includes(hour) && isBurst
      });
      
      if (isBurst) {
        console.log(`Temporal burst detected at ${hour}:00 - ${hourActivities.length} activities (${multiplier.toFixed(1)}x average)`);
      }
    });
  }
  
  /**
   * Update manager action patterns
   */
  private updateManagerActionPatterns(activity: UserActivity): void {
    if (!activity.managerAction) return;
    
    const key = this.getActivityPatternKey(activity);
    
    if (!this.managerActionPatterns.has(key)) {
      this.managerActionPatterns.set(key, {
        patternKey: key,
        actions: {},
        totalCount: 0
      });
    }
    
    const pattern = this.managerActionPatterns.get(key)!;
    pattern.actions[activity.managerAction] = (pattern.actions[activity.managerAction] || 0) + 1;
    pattern.totalCount++;
  }
  
  /**
   * Get suggested action based on manager patterns
   */
  private getSuggestedAction(activity: UserActivity): string | undefined {
    if (!this.config.learnFromManagerActions) return undefined;
    
    const key = this.getActivityPatternKey(activity);
    const pattern = this.managerActionPatterns.get(key);
    
    if (!pattern || pattern.totalCount < 5) return undefined;
    
    const mostCommonAction = Object.entries(pattern.actions)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (!mostCommonAction) return undefined;
    
    const [action, count] = mostCommonAction;
    const confidence = count / pattern.totalCount;
    
    if (confidence > 0.6) {
      return `Based on ${count} similar past activities: ${action}`;
    }
    
    return undefined;
  }
  
  /**
   * Calculate weighted anomaly score
   */
  private calculateWeightedScore(baseScore: number, scores: { [key: string]: number }): number {
    const weights = {
      time: 0.25,
      burst: 0.35,
      volume: 0.15,
      behavior: 0.15,
      integration: 0.10
    };
    
    let totalScore = baseScore;
    let totalWeight = 0;
    
    Object.entries(scores).forEach(([type, score]) => {
      const weight = weights[type as keyof typeof weights] || 0.1;
      totalScore += score * weight;
      totalWeight += weight;
    });
    
    if (totalWeight > 0) {
      return baseScore + (totalScore - baseScore) * (totalWeight / 1.0);
    }
    
    return totalScore;
  }
  
  /**
   * Calculate severity
   */
  private calculateSeverity(score: number, factors: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8 && factors.some(f => 
      f.includes('burst') || f.includes('critical hour') || f.includes('USB'))) {
      return 'critical';
    }
    
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }
  
  /**
   * Helper methods
   */
  private extractHour(activity: UserActivity): number | null {
    if (activity.hour !== undefined && activity.hour !== null) {
      return activity.hour;
    }
    
    if (activity.timestamp) {
      try {
        return new Date(activity.timestamp).getHours();
      } catch (e) {
        return null;
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
  
  private getActivityPatternKey(activity: UserActivity): string {
    const hour = this.extractHour(activity);
    const hourBucket = hour !== null ? Math.floor(hour / 6) : 'unknown';
    const riskBucket = activity.riskScore ? 
      (activity.riskScore >= 2000 ? 'critical' : 
       activity.riskScore >= 1500 ? 'high' : 
       activity.riskScore >= 1000 ? 'medium' : 'low') : 'unknown';
    const integration = activity.integration || 'unknown';
    
    return `${hourBucket}-${riskBucket}-${integration}`;
  }
  
  private sanitizeActivities(activities: UserActivity[]): UserActivity[] {
    return activities.map(activity => {
      if (!activity.user) {
        if (activity.username) {
          activity.user = activity.username;
        } else if (activity.userId) {
          activity.user = activity.userId;
        } else {
          activity.user = `unknown-user-${Math.floor(Math.random() * 100)}`;
        }
      }
      return activity;
    });
  }
  
  private resetBaselines(): void {
    this.userBaselines.clear();
    this.managerActionPatterns.clear();
    this.temporalBurstHistory.clear();
    
    this.globalBaseline = {
      timeOfDayDistribution: Array(24).fill(0),
      activityTypeFrequency: {},
      integrationDistribution: {},
      dataVolumeStats: { mean: 0, stdDev: 0, samples: [] },
      totalActivities: 0,
      hourlyVolumeStats: Array(24).fill(null).map(() => ({
        mean: 0,
        stdDev: 0,
        max: 0,
        samples: []
      }))
    };
  }
  
  private checkCriticalAnomalies(activity: UserActivity): { isCritical: boolean; reason?: string } {
    const hour = this.extractHour(activity);
    
    if (hour !== null && this.config.criticalHours.includes(hour)) {
      const burstInfo = this.temporalBurstHistory.get(hour);
      if (burstInfo && burstInfo.isCritical) {
        return { isCritical: true, reason: 'Activity during critical temporal burst' };
      }
    }
    
    if (activity.integration?.toLowerCase().includes('usb') && 
        activity.riskScore && activity.riskScore >= 2000) {
      return { isCritical: true, reason: 'High-risk USB activity' };
    }
    
    return { isCritical: false };
  }
  
  private calculateConfidence(score: number, threshold: number, factors: string[]): number {
    let confidence = Math.min(0.99, Math.max(0.1, score / threshold));
    
    if (factors.length >= 3) confidence = Math.min(0.99, confidence * 1.1);
    if (factors.some(f => f.includes('burst'))) confidence = Math.min(0.99, confidence * 1.15);
    if (factors.some(f => f.includes('USB'))) confidence = Math.min(0.99, confidence * 1.1);
    
    return confidence;
  }
  
  private getAdaptiveThreshold(activity: UserActivity): number {
    let threshold = this.config.mediumThreshold;
    
    const hour = this.extractHour(activity);
    if (hour !== null && this.config.criticalHours.includes(hour)) {
      threshold = this.config.lowThreshold;
    }
    
    if (activity.integration?.toLowerCase().includes('usb')) {
      threshold = Math.min(threshold, this.config.lowThreshold + 0.05);
    }
    
    return threshold;
  }
  
  private determineAnomalyType(factors: string[]): string {
    if (factors.some(f => f.includes('burst'))) return 'temporal_burst';
    if (factors.some(f => f.includes('critical hour'))) return 'unusual_timing';
    if (factors.some(f => f.includes('USB'))) return 'high_risk_integration';
    if (factors.some(f => f.includes('volume'))) return 'data_exfiltration';
    if (factors.some(f => f.includes('behavior'))) return 'unusual_behavior';
    return 'unknown';
  }
  
  private updateGlobalBaseline(activity: UserActivity): void {
    this.globalBaseline.totalActivities++;
    
    const hour = this.extractHour(activity);
    if (hour !== null) {
      this.globalBaseline.timeOfDayDistribution[hour]++;
      
      const dataSize = activity.dataVolume || activity.fileSize || 0;
      if (dataSize > 0) {
        this.globalBaseline.hourlyVolumeStats[hour].samples.push(dataSize);
      }
    }
    
    if (activity.activityType) {
      this.globalBaseline.activityTypeFrequency[activity.activityType] = 
        (this.globalBaseline.activityTypeFrequency[activity.activityType] || 0) + 1;
    }
    
    if (activity.integration) {
      this.globalBaseline.integrationDistribution[activity.integration] = 
        (this.globalBaseline.integrationDistribution[activity.integration] || 0) + 1;
    }
    
    const dataSize = activity.dataVolume || activity.fileSize || 0;
    if (dataSize > 0) {
      this.globalBaseline.dataVolumeStats.samples.push(dataSize);
    }
  }
  
  private updateUserBaseline(activity: UserActivity): void {
    if (!activity.user) return;
    
    if (!this.userBaselines.has(activity.user)) {
      this.userBaselines.set(activity.user, {
        timeOfDayDistribution: Array(24).fill(0),
        activityTypeFrequency: {},
        integrationFrequency: {},
        totalActivities: 0,
        riskScoreHistory: [],
        lastSeen: new Date()
      });
    }
    
    const userBaseline = this.userBaselines.get(activity.user)!;
    userBaseline.totalActivities++;
    userBaseline.lastSeen = new Date();
    
    const hour = this.extractHour(activity);
    if (hour !== null) {
      userBaseline.timeOfDayDistribution[hour]++;
    }
    
    if (activity.activityType) {
      userBaseline.activityTypeFrequency[activity.activityType] = 
        (userBaseline.activityTypeFrequency[activity.activityType] || 0) + 1;
    }
    
    if (activity.integration) {
      userBaseline.integrationFrequency[activity.integration] = 
        (userBaseline.integrationFrequency[activity.integration] || 0) + 1;
    }
    
    if (activity.riskScore) {
      userBaseline.riskScoreHistory.push(activity.riskScore);
    }
  }
  
  private finalizeBaselines(): void {
    const samples = this.globalBaseline.dataVolumeStats.samples;
    if (samples.length > 0) {
      const stats = this.calculateStats(samples);
      this.globalBaseline.dataVolumeStats = { ...stats, samples };
    }
    
    this.globalBaseline.hourlyVolumeStats.forEach((hourStats, hour) => {
      if (hourStats.samples.length > 0) {
        const stats = this.calculateStats(hourStats.samples);
        this.globalBaseline.hourlyVolumeStats[hour] = { 
          ...stats, 
          max: Math.max(...hourStats.samples),
          samples: hourStats.samples 
        };
      }
    });
  }
  
  private calculateStats(samples: number[]): { mean: number; stdDev: number } {
    const sum = samples.reduce((a, b) => a + b, 0);
    const mean = sum / samples.length;
    
    const squaredDiffs = samples.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / samples.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  }
  
  /**
   * Check if baselines have been built
   */
  public hasBaselines(): boolean {
    return this.userBaselines.size > 0 || this.globalBaseline.totalActivities > 0;
  }
}

/**
 * Enhanced interfaces
 */
interface UserBaseline {
  timeOfDayDistribution: number[];
  activityTypeFrequency: Record<string, number>;
  integrationFrequency: Record<string, number>;
  totalActivities: number;
  riskScoreHistory: number[];
  lastSeen: Date;
}

interface GlobalBaseline {
  timeOfDayDistribution: number[];
  activityTypeFrequency: Record<string, number>;
  integrationDistribution: Record<string, number>;
  dataVolumeStats: {
    mean: number;
    stdDev: number;
    samples: number[];
  };
  totalActivities: number;
  hourlyVolumeStats: {
    mean: number;
    stdDev: number;
    max: number;
    samples: number[];
  }[];
}

interface ManagerActionPattern {
  patternKey: string;
  actions: Record<string, number>;
  totalCount: number;
}

interface BurstInfo {
  hour: number;
  count: number;
  multiplier: number;
  isBurst: boolean;
  isCritical: boolean;
}