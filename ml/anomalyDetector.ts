import { UserActivity } from '../types/activity';

/**
 * Configuration options for the anomaly detector
 */
export interface AnomalyDetectorConfig {
  // Thresholds
  lowThreshold: number;  // Low sensitivity threshold (catches more anomalies)
  mediumThreshold: number; // Balanced threshold
  highThreshold: number; // High sensitivity threshold (fewer false positives)
  
  // Features to analyze
  analyzeTimePatterns: boolean;
  analyzeDataVolume: boolean;  
  analyzeUserBehavior: boolean;
  analyzeActivitySequences: boolean;
  
  // Status weighting (how much to factor in user status)
  trustTrustedActivities: boolean;
  concernWeight: number; // How much to factor in "concern" status

  // Advanced options
  adaptiveThreshold: boolean; // Auto-adjust thresholds based on learning
  minimumBaselineSize: number; // Minimum data points needed for baseline
}

/**
 * Anomaly detection results
 */
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  anomalyType?: string;
  confidence: number;
  factors: string[];
  relatedActivities?: string[];
}

/**
 * Enhanced Anomaly Detection System
 * Provides ML-powered anomaly detection with configurable thresholds
 * and various analysis types.
 */
export class AnomalyDetector {
  private config: AnomalyDetectorConfig;
  private userBaselines: Map<string, UserBaseline> = new Map();
  private globalBaseline: GlobalBaseline = {
    timeOfDayDistribution: Array(24).fill(0),
    activityTypeFrequency: {},
    dataVolumeStats: { mean: 0, stdDev: 0, samples: [] },
    totalActivities: 0
  };
  
  constructor(config?: Partial<AnomalyDetectorConfig>) {
    // Default configuration
    this.config = {
      lowThreshold: 0.6,
      mediumThreshold: 0.75,
      highThreshold: 0.9,
      analyzeTimePatterns: true,
      analyzeDataVolume: true,
      analyzeUserBehavior: true,
      analyzeActivitySequences: true,
      trustTrustedActivities: true,
      concernWeight: 2.0,
      adaptiveThreshold: true,
      minimumBaselineSize: 10,
      ...config
    };
  }
  
  /**
   * Initialize and build baselines from historical activities
   */
  public buildBaselines(activities: UserActivity[]): void {
    if (!activities || activities.length === 0) {
      console.log("Warning: No activities provided to build baselines");
      return;
    }
    
    // Log and sanitize activity data
    const sanitizedActivities = activities.map(activity => {
      // Ensure each activity has a valid user property
      if (!activity.user) {
        // Attempt to find a user identifier
        if (activity.username) {
          activity.user = activity.username;
        } else if (activity.userId) {
          activity.user = activity.userId;
        } else {
          // Generate a dummy user if none found
          activity.user = `unknown-user-${Math.floor(Math.random() * 5)}`; 
        }
      }
      return activity;
    });
    
    console.log(`Building baselines with ${sanitizedActivities.length} activities, found ${new Set(sanitizedActivities.filter(a => a.user).map(a => a.user)).size} unique users`);
    
    this.userBaselines.clear();
    
    // Reset global baseline
    this.globalBaseline = {
      timeOfDayDistribution: Array(24).fill(0),
      activityTypeFrequency: {},
      dataVolumeStats: { mean: 0, stdDev: 0, samples: [] },
      totalActivities: 0
    };
    
    // First pass: collect all data points
    sanitizedActivities.forEach(activity => {
      this.updateGlobalBaseline(activity);
      this.updateUserBaseline(activity);
    });
    
    // Second pass: calculate statistics
    this.finalizeBaselines();
    
    console.log(`Built baselines for ${this.userBaselines.size} users with ${activities.length} activities`);
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
   * Detect if a single activity is anomalous
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
    
    // Skip analysis if trusted & configured to trust
    if (this.config.trustTrustedActivities && 
        activity.status === 'trusted') {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        confidence: 0.95,
        factors: ['Activity is explicitly trusted']
      };
    }
    
    // Initial concern level based on activity status
    let initialConcernLevel = 0;
    if (activity.status === 'concern') {
      initialConcernLevel = 0.3 * this.config.concernWeight;
    } else if (activity.status === 'underReview') {
      initialConcernLevel = 0.1;
    }
    
    const factors: string[] = [];
    let anomalyScore = initialConcernLevel;
    let weight = 0;
    
    // Analyze time patterns
    if (this.config.analyzeTimePatterns) {
      const timeScore = this.detectTimeAnomaly(activity);
      if (timeScore > 0) {
        anomalyScore += timeScore * 0.3;
        weight += 0.3;
        factors.push(`Unusual time pattern (score: ${timeScore.toFixed(2)})`);
      }
    }
    
    // Analyze data volume
    if (this.config.analyzeDataVolume) {
      const volumeScore = this.detectVolumeAnomaly(activity);
      if (volumeScore > 0) {
        anomalyScore += volumeScore * 0.25;
        weight += 0.25;
        factors.push(`Unusual data volume (score: ${volumeScore.toFixed(2)})`);
      }
    }
    
    // Analyze user behavior
    if (this.config.analyzeUserBehavior) {
      const behaviorScore = this.detectBehaviorAnomaly(activity);
      if (behaviorScore > 0) {
        anomalyScore += behaviorScore * 0.35;
        weight += 0.35;
        factors.push(`Unusual user behavior (score: ${behaviorScore.toFixed(2)})`);
      }
    }
    
    // Normalize the score if we have weights
    if (weight > 0) {
      anomalyScore = (anomalyScore / weight) * (1 - initialConcernLevel) + initialConcernLevel;
    }
    
    // Get threshold based on sensitivity
    const threshold = this.getThreshold();
    
    // Calculate confidence based on how far above threshold
    const confidence = Math.min(0.99, Math.max(0.1, 
      threshold > 0 ? Math.min(1, anomalyScore / threshold) : 0));
    
    return {
      isAnomaly: anomalyScore >= threshold,
      anomalyScore,
      anomalyType: this.determineAnomalyType(factors),
      confidence,
      factors
    };
  }
  
  /**
   * Detect time-based anomalies
   */
  private detectTimeAnomaly(activity: UserActivity): number {
    if (!activity.timestamp && !activity.hour) return 0;
    
    let hourOfDay: number;
    
    if (activity.hour !== undefined && activity.hour !== null) {
      hourOfDay = activity.hour;
    } else if (activity.timestamp) {
      hourOfDay = new Date(activity.timestamp).getHours();
    } else {
      return 0;
    }
    
    // Check against global baseline
    const expectedFrequency = this.globalBaseline.timeOfDayDistribution[hourOfDay] / 
      Math.max(1, this.globalBaseline.totalActivities);
    
    // Higher score for less common times
    const unusualTimeScore = 1 - Math.min(1, expectedFrequency * 24 * 3);
    
    // Check if user has a baseline
    let userUnusualTimeScore = 0;
    if (activity.user) {
      const userBaseline = this.userBaselines.get(activity.user);
      if (userBaseline && userBaseline.timeOfDayDistribution) {
        const userExpectedFrequency = userBaseline.timeOfDayDistribution[hourOfDay] / 
          Math.max(1, userBaseline.totalActivities);
        userUnusualTimeScore = 1 - Math.min(1, userExpectedFrequency * 24 * 3);
      }
    }
    
    // Return maximum of global and user-specific scores
    return Math.max(unusualTimeScore, userUnusualTimeScore);
  }
  
  /**
   * Detect volume-based anomalies (large file transfers, etc.)
   */
  private detectVolumeAnomaly(activity: UserActivity): number {
    const dataSize = activity.dataVolume || activity.fileSize || 0;
    if (dataSize === 0) return 0;
    
    const { mean, stdDev } = this.globalBaseline.dataVolumeStats;
    
    // Skip if we don't have enough data
    if (stdDev === 0 || this.globalBaseline.dataVolumeStats.samples.length < 2) return 0;
    
    // Calculate z-score (how many standard deviations from mean)
    const zScore = (dataSize - mean) / stdDev;
    
    // Only interested in abnormally large volumes
    if (zScore <= 2) return 0;
    
    // Score between 0-1 based on how extreme the z-score is
    return Math.min(1, (zScore - 2) / 6);
  }
  
  /**
   * Detect behavior anomalies (unusual patterns for specific user)
   */
  private detectBehaviorAnomaly(activity: UserActivity): number {
    if (!activity.user || !activity.activityType) return 0;
    
    const userBaseline = this.userBaselines.get(activity.user);
    if (!userBaseline || userBaseline.totalActivities < this.config.minimumBaselineSize) {
      // Not enough baseline data for this user
      return 0;
    }
    
    // Check if activity type is unusual for this user
    const userActivityFreq = userBaseline.activityTypeFrequency[activity.activityType] || 0;
    const userActivityScore = 1 - Math.min(1, userActivityFreq / Math.max(1, userBaseline.totalActivities) * 10);
    
    // If a user that rarely performs an action suddenly does it, that's suspicious
    return userActivityScore;
  }
  
  /**
   * Update global baseline with a new activity
   */
  private updateGlobalBaseline(activity: UserActivity): void {
    this.globalBaseline.totalActivities++;
    
    // Update time distribution
    if (activity.timestamp) {
      const hour = new Date(activity.timestamp).getHours();
      this.globalBaseline.timeOfDayDistribution[hour]++;
    } else if (activity.hour !== undefined && activity.hour !== null) {
      const hour = activity.hour;
      if (hour >= 0 && hour < 24) {
        this.globalBaseline.timeOfDayDistribution[hour]++;
      }
    }
    
    // Update activity type frequency
    if (activity.activityType) {
      this.globalBaseline.activityTypeFrequency[activity.activityType] = 
        (this.globalBaseline.activityTypeFrequency[activity.activityType] || 0) + 1;
    }
    
    // Update data volume stats
    const dataSize = activity.dataVolume || activity.fileSize || 0;
    if (dataSize > 0) {
      this.globalBaseline.dataVolumeStats.samples.push(dataSize);
    }
  }
  
  /**
   * Update user-specific baseline with a new activity
   */
  private updateUserBaseline(activity: UserActivity): void {
    // Skip activities without user information
    if (!activity.user) {
      console.log("Warning: Activity without user field encountered:", 
                  activity.id || 'No ID');
      return;
    }
    
    if (!this.userBaselines.has(activity.user)) {
      this.userBaselines.set(activity.user, {
        timeOfDayDistribution: Array(24).fill(0),
        activityTypeFrequency: {},
        totalActivities: 0
      });
    }
    
    const userBaseline = this.userBaselines.get(activity.user)!;
    userBaseline.totalActivities++;
    
    // Update time distribution
    if (activity.timestamp) {
      try {
        const hour = new Date(activity.timestamp).getHours();
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          userBaseline.timeOfDayDistribution[hour]++;
        }
      } catch (error) {
        // Invalid timestamp format, try to use hour directly
        if (activity.hour !== undefined && activity.hour !== null) {
          const hour = activity.hour;
          if (hour >= 0 && hour < 24) {
            userBaseline.timeOfDayDistribution[hour]++;
          }
        }
      }
    } else if (activity.hour !== undefined && activity.hour !== null) {
      const hour = activity.hour;
      if (hour >= 0 && hour < 24) {
        userBaseline.timeOfDayDistribution[hour]++;
      }
    }
    
    // Update activity type frequency
    if (activity.activityType) {
      userBaseline.activityTypeFrequency[activity.activityType] = 
        (userBaseline.activityTypeFrequency[activity.activityType] || 0) + 1;
    }
  }
  
  /**
   * Calculate final statistics for baselines
   */
  private finalizeBaselines(): void {
    // Calculate data volume statistics
    const samples = this.globalBaseline.dataVolumeStats.samples;
    if (samples.length > 0) {
      // Calculate mean
      const sum = samples.reduce((a, b) => a + b, 0);
      const mean = sum / samples.length;
      
      // Calculate standard deviation
      const squaredDiffs = samples.map(x => Math.pow(x - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / samples.length;
      const stdDev = Math.sqrt(variance);
      
      this.globalBaseline.dataVolumeStats.mean = mean;
      this.globalBaseline.dataVolumeStats.stdDev = stdDev;
    }
  }
  
  /**
   * Get the anomaly threshold based on current configuration
   */
  private getThreshold(): number {
    const { lowThreshold, mediumThreshold, highThreshold } = this.config;
    // For now just return medium threshold
    return mediumThreshold;
  }
  
  /**
   * Determine the type of anomaly based on contributing factors
   */
  private determineAnomalyType(factors: string[]): string {
    if (factors.some(f => f.includes('time'))) {
      return 'unusual_timing';
    } else if (factors.some(f => f.includes('volume'))) {
      return 'data_exfiltration';
    } else if (factors.some(f => f.includes('behavior'))) {
      return 'unusual_behavior';
    } else {
      return 'unknown';
    }
  }
}

/**
 * User-specific baseline information
 */
interface UserBaseline {
  timeOfDayDistribution: number[];
  activityTypeFrequency: Record<string, number>;
  totalActivities: number;
}

/**
 * Global baseline information across all users
 */
interface GlobalBaseline {
  timeOfDayDistribution: number[];
  activityTypeFrequency: Record<string, number>;
  dataVolumeStats: {
    mean: number;
    stdDev: number;
    samples: number[];
  };
  totalActivities: number;
} 