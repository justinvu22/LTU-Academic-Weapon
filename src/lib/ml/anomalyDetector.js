import * as tf from '@tensorflow/tfjs';

export class AnomalyDetector {
  constructor() {
    this.featureMeans = {};
    this.featureStds = {};
    this.threshold = 2.0; // Standard deviations from mean
    this.numericalFeatures = [
      'riskScore', 
      'policyBreachCount', 
      'hourOfDay', 
      'combinedRisk',
      'userActivityFrequency',
      'timeSinceLastActivity',
      'riskScoreTrend'
    ];
    
    // Risk thresholds based on actual data
    this.riskThresholds = {
      high: 2000,    // High risk threshold
      medium: 1000,  // Medium risk threshold
      low: 500       // Low risk threshold
    };
    
    // User behavior profiles
    this.userProfiles = new Map();
    this.timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }
  
  // Train model on "normal" data
  train(activities) {
    if (activities.length === 0) {
      console.error("Cannot train on empty dataset");
      return;
    }
    
    // First, build user profiles
    this.buildUserProfiles(activities);
    
    // Calculate mean and standard deviation for numerical features
    this.numericalFeatures.forEach(feature => {
      // Get values and filter out invalid entries
      const values = activities
        .map(a => a[feature])
        .filter(v => v !== undefined && v !== null && !isNaN(v));
      
      if (values.length === 0) {
        console.warn(`No valid values for feature ${feature}, using defaults`);
        this.featureMeans[feature] = 0;
        this.featureStds[feature] = 1; // Default to prevent division by zero
        return;
      }
      
      try {
        // Calculate mean using TensorFlow.js
        const tensor = tf.tensor1d(values);
        this.featureMeans[feature] = tf.mean(tensor).dataSync()[0];
        
        // Calculate standard deviation manually
        const mean = this.featureMeans[feature];
        const squareDiffs = values.map(val => {
          const diff = val - mean;
          return diff * diff;
        });
        
        const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        this.featureStds[feature] = Math.sqrt(avgSquareDiff) || 1; // Use 1 if result is 0
        
        // Clean up tensor
        tensor.dispose();
      } catch (error) {
        console.error(`Error processing feature ${feature}:`, error);
        this.featureMeans[feature] = 0;
        this.featureStds[feature] = 1; // Default values
      }
    });
    
    console.log('Model trained on', activities.length, 'activities');
    console.log('Feature statistics:', { 
      means: this.featureMeans, 
      stds: this.featureStds 
    });
  }
  
  // Build user behavior profiles
  buildUserProfiles(activities) {
    // Group activities by user
    const userActivities = new Map();
    activities.forEach(activity => {
      if (!userActivities.has(activity.user)) {
        userActivities.set(activity.user, []);
      }
      userActivities.get(activity.user).push(activity);
    });
    
    // Build profile for each user
    userActivities.forEach((userActs, user) => {
      // Sort activities by timestamp
      userActs.sort((a, b) => a.timestamp - b.timestamp);
      
      // Calculate user-specific metrics
      const profile = {
        avgRiskScore: this.calculateAverage(userActs.map(a => a.riskScore)),
        activityFrequency: this.calculateActivityFrequency(userActs),
        typicalHours: this.calculateTypicalHours(userActs),
        riskScoreTrend: this.calculateRiskScoreTrend(userActs),
        lastActivity: userActs[userActs.length - 1].timestamp
      };
      
      this.userProfiles.set(user, profile);
    });
  }
  
  // Calculate average of an array
  calculateAverage(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  // Calculate typical activity frequency
  calculateActivityFrequency(activities) {
    if (activities.length < 2) return 0;
    
    const timeSpans = [];
    for (let i = 1; i < activities.length; i++) {
      timeSpans.push(activities[i].timestamp - activities[i-1].timestamp);
    }
    
    return this.calculateAverage(timeSpans);
  }
  
  // Calculate typical hours of activity
  calculateTypicalHours(activities) {
    const hours = activities.map(a => a.timestamp.getHours());
    const hourCounts = new Array(24).fill(0);
    hours.forEach(hour => hourCounts[hour]++);
    return hourCounts;
  }
  
  // Calculate risk score trend
  calculateRiskScoreTrend(activities) {
    if (activities.length < 2) return 0;
    
    const recentActivities = activities.slice(-5); // Last 5 activities
    const riskScores = recentActivities.map(a => a.riskScore);
    const timestamps = recentActivities.map(a => a.timestamp);
    
    // Simple linear regression for trend
    const n = riskScores.length;
    const sumX = timestamps.reduce((sum, t) => sum + t, 0);
    const sumY = riskScores.reduce((sum, r) => sum + r, 0);
    const sumXY = timestamps.reduce((sum, t, i) => sum + t * riskScores[i], 0);
    const sumX2 = timestamps.reduce((sum, t) => sum + t * t, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
  
  // Detect anomalies in activities
  detectAnomalies(activities) {
    return activities.map(activity => {
      // Get user profile
      const userProfile = this.userProfiles.get(activity.user) || {};
      
      // Calculate additional features
      const features = {
        ...activity,
        userActivityFrequency: this.calculateUserActivityFrequency(activity, userProfile),
        timeSinceLastActivity: this.calculateTimeSinceLastActivity(activity, userProfile),
        riskScoreTrend: this.calculateRiskScoreTrend([...userProfile.recentActivities || [], activity])
      };
      
      // Calculate z-score for each numerical feature
      const zScores = {};
      let maxZScore = 0;
      
      this.numericalFeatures.forEach(feature => {
        if (this.featureStds[feature] > 0) {
          const zScore = Math.abs(
            (features[feature] - this.featureMeans[feature]) / 
            this.featureStds[feature]
          );
          zScores[feature] = zScore;
          maxZScore = Math.max(maxZScore, zScore);
        }
      });
      
      // Special case checks (logical rules)
      const isHighRisk = activity.riskScore >= this.riskThresholds.high;
      const isMediumRisk = activity.riskScore >= this.riskThresholds.medium;
      const isOffHoursHighRisk = activity.isOffHours && isHighRisk;
      const isWeekendActivity = activity.isWeekend;
      const isUnusualTime = this.isUnusualTime(activity, userProfile);
      const isRapidActivity = this.isRapidActivity(activity, userProfile);
      
      // Determine if this is an anomaly
      const isAnomaly = maxZScore > this.threshold || 
                       isHighRisk || 
                       (isMediumRisk && (isOffHoursHighRisk || isUnusualTime)) || 
                       isRapidActivity;
      
      return {
        ...activity,
        anomalyScore: maxZScore,
        zScores,
        isAnomaly,
        riskLevel: this.calculateRiskLevel(activity.riskScore),
        anomalyFactors: this.getAnomalyFactors(activity, zScores, {
          isHighRisk,
          isMediumRisk,
          isOffHoursHighRisk,
          isWeekendActivity,
          isUnusualTime,
          isRapidActivity
        })
      };
    });
  }
  
  // Calculate user activity frequency deviation
  calculateUserActivityFrequency(activity, profile) {
    if (!profile.activityFrequency) return 0;
    
    const timeSinceLast = activity.timestamp - profile.lastActivity;
    return Math.abs(timeSinceLast - profile.activityFrequency) / profile.activityFrequency;
  }
  
  // Calculate time since last activity
  calculateTimeSinceLastActivity(activity, profile) {
    if (!profile.lastActivity) return 0;
    return activity.timestamp - profile.lastActivity;
  }
  
  // Check if activity time is unusual for this user
  isUnusualTime(activity, profile) {
    if (!profile.typicalHours) return false;
    
    const hour = activity.timestamp.getHours();
    const typicalHourCount = profile.typicalHours[hour];
    const avgHourCount = profile.typicalHours.reduce((sum, count) => sum + count, 0) / 24;
    
    return typicalHourCount < avgHourCount * 0.5; // Less than 50% of average activity
  }
  
  // Check for rapid succession of activities
  isRapidActivity(activity, profile) {
    if (!profile.lastActivity) return false;
    
    const timeSinceLast = activity.timestamp - profile.lastActivity;
    return timeSinceLast < profile.activityFrequency * 0.25; // 25% of typical interval
  }
  
  // Identify what factors make this an anomaly
  getAnomalyFactors(activity, zScores, specialCases) {
    const factors = [];
    
    // Check risk level
    if (specialCases.isHighRisk) {
      factors.push('High risk score detected');
    } else if (specialCases.isMediumRisk) {
      factors.push('Medium risk score detected');
    }
    
    // Check statistical anomalies
    this.numericalFeatures.forEach(feature => {
      if (zScores[feature] > this.threshold) {
        factors.push(`Unusual ${feature}: ${activity[feature]}`);
      }
    });
    
    // Check special cases
    if (specialCases.isOffHoursHighRisk) {
      factors.push('High-risk activity outside business hours');
    }
    
    if (specialCases.isWeekendActivity) {
      factors.push('Weekend activity');
    }
    
    if (specialCases.isUnusualTime) {
      factors.push('Activity at unusual time for this user');
    }
    
    if (specialCases.isRapidActivity) {
      factors.push('Rapid succession of activities');
    }
    
    return factors;
  }
  
  // Set the anomaly threshold
  setThreshold(threshold) {
    this.threshold = threshold;
  }
  
  // Add a method to calculate risk level
  calculateRiskLevel(riskScore) {
    if (riskScore >= this.riskThresholds.high) return 'high';
    if (riskScore >= this.riskThresholds.medium) return 'medium';
    if (riskScore >= this.riskThresholds.low) return 'low';
    return 'normal';
  }
} 