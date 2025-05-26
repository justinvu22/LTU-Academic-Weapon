import * as tf from '@tensorflow/tfjs';
import { UserActivity } from '../../types/activity';

/**
 * Check if code is running in browser
 */
const isBrowser = () => typeof window !== 'undefined';

/**
 * Performs anomaly detection using an autoencoder neural network
 * Autoencoders are unsupervised learning algorithms that compress data and 
 * reconstruct it, with anomalies having higher reconstruction error
 */
export class AnomalyDetector {
  private model: tf.LayersModel | null = null;
  private threshold: number = 0;
  private featureCount: number = 6;
  private isModelTrained: boolean = false;
  
  constructor() {
    // Initialize model architecture
    this.buildModel();
  }
  
  /**
   * Build autoencoder model for anomaly detection
   */
  private buildModel(): void {
    try {
      const inputDim = this.featureCount;
      
      // Create sequential model
      const model = tf.sequential();
      
      // Encoder layers
      model.add(tf.layers.dense({
        inputShape: [inputDim],
        units: Math.max(Math.floor(inputDim / 2), 2),
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l1({ l1: 0.01 })
      }));
      
      // Bottleneck layer
      model.add(tf.layers.dense({
        units: Math.max(Math.floor(inputDim / 3), 1),
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l1({ l1: 0.01 })
      }));
      
      // Decoder layers
      model.add(tf.layers.dense({
        units: Math.max(Math.floor(inputDim / 2), 2),
        activation: 'relu'
      }));
      
      // Output layer
      model.add(tf.layers.dense({
        units: inputDim,
        activation: 'sigmoid'
      }));
      
      // Compile model
      model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError'
      });
      
      this.model = model;
      console.log('Anomaly detection model built successfully');
    } catch (error) {
      console.error('Error building anomaly detection model:', error);
    }
  }
  
  /**
   * Extract features from user activities for anomaly detection
   */
  private extractFeatures(activities: UserActivity[]): number[][] {
    return activities.map(activity => {
      // Normalize timestamps to hour of day (0-23)
      const hour = activity.timestamp ? new Date(activity.timestamp).getHours() / 23 : 0.5;
      
      // Normalize risk score (0-1)
      const riskScore = Math.min((activity.riskScore || 0) / 3000, 1);
      
      // Count policy breaches - include the actual breach count, not just keys
      let breachCount = 0;
      if (activity.policiesBreached) {
        Object.entries(activity.policiesBreached).forEach(([_key, value]) => {
          if (Array.isArray(value)) {
            breachCount += value.length;
          } else if (typeof value === 'boolean' && value) {
            breachCount += 1;
          } else if (value) {
            breachCount += 1;
          }
        });
      }
      // Normalize to 0-1 range
      breachCount = Math.min(breachCount / 10, 1);
      
      // Integration type (one-hot encoded)
      let integrationType = 0;
      if (activity.integration) {
        const integration = activity.integration.toLowerCase();
        if (integration.includes('email')) integrationType = 1/5;
        else if (integration.includes('cloud')) integrationType = 2/5;
        else if (integration.includes('usb')) integrationType = 3/5;
        else if (integration.includes('app')) integrationType = 4/5;
        else if (integration.includes('file')) integrationType = 5/5;
      }
      
      // Actions - binary flags
      const isDownload = activity.activity?.toLowerCase().includes('download') ? 1 : 0;
      const isUpload = activity.activity?.toLowerCase().includes('upload') ? 1 : 0;
      
      return [hour, riskScore, breachCount, integrationType, isDownload, isUpload];
    });
  }
  
  /**
   * Train model on normal activity data
   */
  async trainModel(activities: UserActivity[], epochs: number = 50): Promise<boolean> {
    try {
      if (!this.model || activities.length < 10) {
        console.error('Cannot train model: no model or insufficient data');
        return false;
      }
      
      // Extract features from activities
      const features = this.extractFeatures(activities);
      
      // Convert to tensor
      const featureTensor = tf.tensor2d(features);
      
      // Train autoencoder (input = output for reconstruction)
      await this.model.fit(featureTensor, featureTensor, {
        epochs: epochs,
        batchSize: Math.min(32, Math.floor(activities.length / 2)),
        shuffle: true,
        verbose: 0
      });
      
      // Calculate reconstruction errors to set threshold
      const predictions = this.model.predict(featureTensor) as tf.Tensor;
      const errors = tf.sub(featureTensor, predictions).square().mean(1);
      
      // Get reconstruction errors as array
      const errorValues = await errors.data();
      
      // Sort errors and set threshold at 95th percentile
      const sortedErrors = Array.from(errorValues).sort((a, b) => a - b);
      const thresholdIndex = Math.floor(sortedErrors.length * 0.95);
      this.threshold = sortedErrors[thresholdIndex];
      
      console.log(`Model trained successfully with threshold: ${this.threshold}`);
      
      // Clean up tensors
      featureTensor.dispose();
      predictions.dispose();
      errors.dispose();
      
      this.isModelTrained = true;
      return true;
    } catch (error) {
      console.error('Error training anomaly detection model:', error);
      return false;
    }
  }
  
  /**
   * Detect anomalies in activities
   */
  async detectAnomalies(activities: UserActivity[]): Promise<{
    isAnomaly: boolean[];
    anomalyScores: number[];
    dates: string[];
  }> {
    if (!this.model || !this.isModelTrained) {
      console.error('Model not trained yet');
      return { 
        isAnomaly: activities.map(() => false),
        anomalyScores: activities.map(() => 0),
        dates: activities.map(a => this.getDateString(a))
      };
    }
    
    try {
      // Extract features
      const features = this.extractFeatures(activities);
      
      // Convert to tensor
      const featureTensor = tf.tensor2d(features);
      
      // Get predictions
      const predictions = this.model.predict(featureTensor) as tf.Tensor;
      
      // Calculate reconstruction error
      const errors = tf.sub(featureTensor, predictions).square().mean(1);
      
      // Convert to array
      const errorValues = await errors.data();
      
      // Classify anomalies
      const isAnomaly = Array.from(errorValues).map(error => error > this.threshold);
      
      // Extract dates for grouping
      const dates = activities.map(a => this.getDateString(a));
      
      // Normalize anomaly scores (0-100)
      const maxError = Math.max(...Array.from(errorValues), this.threshold * 1.5);
      const anomalyScores = Array.from(errorValues).map(error => 
        Math.min(Math.round((error / maxError) * 100), 100)
      );
      
      // Clean up tensors
      featureTensor.dispose();
      predictions.dispose();
      errors.dispose();
      
      return { isAnomaly, anomalyScores, dates };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { 
        isAnomaly: activities.map(() => false),
        anomalyScores: activities.map(() => 0),
        dates: activities.map(a => this.getDateString(a))
      };
    }
  }
  
  /**
   * Get formatted date string from activity
   */
  private getDateString(activity: UserActivity): string {
    if (activity.timestamp) {
      return new Date(activity.timestamp).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short' 
      });
    } else if (activity.date) {
      return activity.date;
    }
    return 'Unknown';
  }
}

/**
 * Detect anomalies in time series data using autoencoders
 */
export async function generateAnomalyTimelineData(activities: UserActivity[]): Promise<any[]> {
  // Return empty array if no activities
  if (!activities || activities.length === 0) {
    return [];
  }
  
  try {
    // Skip TensorFlow operations if not in browser
    if (!isBrowser()) {
      console.log('Skipping anomaly detection in server environment');
      return [];
    }
    
    // Performance optimization - limit number of activities for processing
    const MAX_ANOMALY_ACTIVITIES = 500;
    let processActivities = activities;
    
    if (activities.length > MAX_ANOMALY_ACTIVITIES) {
      console.log(`Limiting anomaly detection to ${MAX_ANOMALY_ACTIVITIES} activities for performance`);
      // Take a stratified sample of activities
      processActivities = getStratifiedSample(activities, MAX_ANOMALY_ACTIVITIES);
    }
    
    // Ensure TensorFlow is properly initialized
    await ensureTfInitialized();
    
    // Group activities by date
    const dateMap = new Map<string, { 
      activities: number; 
      riskSum: number;
      anomalyScore: number;
      anomalies: number;
    }>();
    
    // Extract all dates and sort
    const sortedActivities = [...processActivities].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateA - dateB;
    });
    
    // Group by date
    sortedActivities.forEach(activity => {
      if (!activity.timestamp) return;
      
      const date = new Date(activity.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { 
          activities: 0, 
          riskSum: 0, 
          anomalyScore: 0,
          anomalies: 0
        });
      }
      
      const entry = dateMap.get(dateStr)!;
      entry.activities++;
      entry.riskSum += activity.riskScore || 0;
      
      // Pre-flag extremely high risk activities as anomalies
      if (activity.riskScore && activity.riskScore > 2000) {
        entry.anomalies++;
      }
    });
    
    // Format data for timeline
    const timelineData: any[] = [];
    const dates = Array.from(dateMap.keys()).sort();
    
    // Generate timeline with anomaly scores
    for (const date of dates) {
      const entry = dateMap.get(date)!;
      const avgRisk = entry.activities > 0 ? entry.riskSum / entry.activities : 0;
      
      timelineData.push({
        date,
        activities: entry.activities,
        risk: Math.round(avgRisk),
        anomalyScore: 0, // Will be computed later
        anomalies: entry.anomalies // Pre-detected high-risk anomalies
      });
    }
    
    // Detect timeline anomalies if we have enough data points
    if (timelineData.length >= 5) {
      // Skip anomaly detection for extremely small datasets
      await detectAnomalies(timelineData);
    }
    
    return timelineData;
  } catch (error) {
    console.error('Error generating anomaly timeline data:', error);
    // Return basic data without anomaly detection
    return [];
  }
}

/**
 * Safely ensure TensorFlow is initialized in browser environment
 */
async function ensureTfInitialized() {
  if (!isBrowser()) return;
  
  try {
    // Check if TF is already initialized
    if (tf.getBackend()) {
      return; // Already initialized
    }
    
    // Choose the best backend based on hardware
    await tf.ready();
    
    // Prefer WebGL for performance if available
    if (tf.findBackend('webgl')) {
      await tf.setBackend('webgl');
    } else {
      // Fall back to CPU
      await tf.setBackend('cpu');
    }
    
    console.log('TensorFlow.js initialized with backend:', tf.getBackend());
  } catch (error) {
    console.warn('TensorFlow initialization error, using fallbacks:', error);
  }
}

/**
 * Detect anomalies in timeline data
 */
async function detectAnomalies(timelineData: any[]): Promise<void> {
  if (!isBrowser() || !timelineData.length) return;
  
  try {
    // Extract activity counts as features
    const features = timelineData.map(entry => entry.activities);
    
    // Simple statistical anomaly detection for small datasets
    const mean = features.reduce((sum, val) => sum + val, 0) / features.length;
    const squaredDiffs = features.map(val => Math.pow(val - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / features.length);
    
    // Calculate z-scores and mark anomalies (z-score > 2.0 is considered unusual)
    const threshold = 2.0;
    
    timelineData.forEach((entry, _i) => {
      const zScore = Math.abs((entry.activities - mean) / Math.max(0.1, stdDev));
      entry.anomalyScore = Math.min(100, Math.round(zScore * 33)); // Scale for visualization
      
      // Mark as anomaly if z-score exceeds threshold
      if (zScore > threshold && entry.anomalies === 0) {
        entry.anomalies = 1;
      }
    });
  } catch (error) {
    console.error('Error in anomaly detection:', error);
  }
}

/**
 * Get a stratified sample of activities with representation across different risk levels
 * @param activities Array of user activities 
 * @param maxSamples Maximum number of samples to return
 * @returns Stratified sample of activities
 */
function getStratifiedSample(activities: UserActivity[], maxSamples: number): UserActivity[] {
  // Group activities by risk level
  const high: UserActivity[] = [];
  const medium: UserActivity[] = [];
  const low: UserActivity[] = [];
  
  activities.forEach(activity => {
    const risk = activity.riskScore || 0;
    if (risk >= 1500) {
      high.push(activity);
    } else if (risk >= 800) {
      medium.push(activity);
    } else {
      low.push(activity);
    }
  });
  
  // Calculate how many to sample from each group
  const totalActivities = activities.length;
  const highRatio = high.length / totalActivities;
  const mediumRatio = medium.length / totalActivities;
  
  const highSamples = Math.ceil(maxSamples * highRatio);
  const mediumSamples = Math.ceil(maxSamples * mediumRatio);
  const lowSamples = Math.max(0, maxSamples - highSamples - mediumSamples);
  
  // Sample from each group
  const sample: UserActivity[] = [
    ...sampleArray(high, highSamples),
    ...sampleArray(medium, mediumSamples),
    ...sampleArray(low, lowSamples)
  ];
  
  return sample;
}

/**
 * Sample n items from an array
 */
function sampleArray<T>(array: T[], n: number): T[] {
  if (n >= array.length) return array;
  if (n <= 0) return [];
  
  const result: T[] = [];
  const step = array.length / n;
  
  // Take evenly distributed samples
  for (let i = 0; i < array.length && result.length < n; i += step) {
    result.push(array[Math.floor(i)]);
  }
  
  return result;
} 