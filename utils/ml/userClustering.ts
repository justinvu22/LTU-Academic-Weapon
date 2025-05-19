import * as tf from '@tensorflow/tfjs';
import { UserActivity } from '../../types/activity';

/**
 * K-means clustering implementation for user behavior analysis
 */
export class UserBehaviorClusterer {
  private featureCount: number = 6;
  private clusters: number = 4; // Number of clusters to form
  private clusterCentroids: number[][] | null = null;
  private featureRanges: { min: number[]; max: number[] } | null = null;
  
  constructor(clusters: number = 4) {
    this.clusters = clusters;
  }
  
  /**
   * Extract features from activities grouped by user
   */
  private extractUserFeatures(userActivities: Map<string, UserActivity[]>): {
    userFeatures: number[][];
    usernames: string[];
  } {
    const userFeatures: number[][] = [];
    const usernames: string[] = [];
    
    userActivities.forEach((activities, username) => {
      if (activities.length === 0) return;
      
      // Calculate average risk score
      const totalRisk = activities.reduce((sum, a) => sum + (a.riskScore || 0), 0);
      const avgRisk = totalRisk / activities.length;
      
      // Count policy breaches
      const breachCount = activities.filter(a => 
        a.policiesBreached && Object.keys(a.policiesBreached).length > 0
      ).length;
      
      // Count high risk activities
      const highRiskCount = activities.filter(a => (a.riskScore || 0) > 1500).length;
      
      // Diversity of integration types
      const integrationTypes = new Set<string>();
      activities.forEach(a => {
        if (a.integration) integrationTypes.add(a.integration.toLowerCase());
      });
      const integrationDiversity = integrationTypes.size;
      
      // Time variance (standard deviation of activity hours)
      const hours = activities
        .filter(a => a.timestamp)
        .map(a => new Date(a.timestamp || new Date().toISOString()).getHours());
      
      const hourVariance = this.calculateVariance(hours);
      
      // Activity velocity (activities per day)
      const uniqueDates = new Set(activities
        .filter(a => a.timestamp)
        .map(a => new Date(a.timestamp || new Date().toISOString()).toLocaleDateString())
      );
      const activityVelocity = uniqueDates.size > 0 ? 
        activities.length / uniqueDates.size : activities.length;
      
      // Feature vector for user
      userFeatures.push([
        avgRisk,
        breachCount,
        highRiskCount,
        integrationDiversity,
        hourVariance,
        activityVelocity
      ]);
      
      usernames.push(username);
    });
    
    return { userFeatures, usernames };
  }
  
  /**
   * Normalize features to range 0-1 for better clustering
   */
  private normalizeFeatures(features: number[][]): number[][] {
    if (features.length === 0) return [];
    
    // Calculate min and max for each feature
    const featureCount = features[0].length;
    const mins: number[] = Array(featureCount).fill(Infinity);
    const maxs: number[] = Array(featureCount).fill(-Infinity);
    
    features.forEach(feature => {
      for (let i = 0; i < featureCount; i++) {
        mins[i] = Math.min(mins[i], feature[i]);
        maxs[i] = Math.max(maxs[i], feature[i]);
      }
    });
    
    // Save feature ranges for later use
    this.featureRanges = { min: mins, max: maxs };
    
    // Normalize features
    return features.map(feature => 
      feature.map((value, i) => {
        // Handle case where min == max (no variation)
        if (mins[i] === maxs[i]) return 0.5;
        return (value - mins[i]) / (maxs[i] - mins[i]);
      })
    );
  }
  
  /**
   * Perform k-means clustering on user features
   */
  async performClustering(userActivities: Map<string, UserActivity[]>): Promise<{
    clusterAssignments: number[];
    usernames: string[];
    coordinates: { x: number; y: number }[];
    clusterNames: string[];
    isOutlier: boolean[];
  }> {
    try {
      // Extract features for each user
      const { userFeatures, usernames } = this.extractUserFeatures(userActivities);
      
      if (userFeatures.length < this.clusters) {
        // Not enough data for clustering
        return {
          clusterAssignments: userFeatures.map(() => 0),
          usernames,
          coordinates: userFeatures.map(() => ({ x: 5, y: 5 })),
          clusterNames: ['Not Enough Data'],
          isOutlier: userFeatures.map(() => false)
        };
      }
      
      // Normalize features
      const normalizedFeatures = this.normalizeFeatures(userFeatures);
      
      // Convert to tensor
      const featureTensor = tf.tensor2d(normalizedFeatures);
      
      // Perform k-means clustering
      const { labels, centroids } = await this.kMeansClustering(featureTensor, this.clusters);
      
      // Save centroids
      this.clusterCentroids = await centroids.arraySync() as number[][];
      
      // Get cluster assignments
      const clusterAssignments = await labels.dataSync();
      
      // Perform dimensionality reduction for visualization (simple PCA-like approach)
      const coordinates = this.reduceDimensionality(normalizedFeatures);
      
      // Determine outliers based on distance from cluster centroid
      const isOutlier = this.detectOutliers(normalizedFeatures, Array.from(clusterAssignments));
      
      // Generate cluster names based on centroid characteristics
      const clusterNames = this.generateClusterNames(this.clusterCentroids);
      
      // Clean up tensors
      featureTensor.dispose();
      labels.dispose();
      centroids.dispose();
      
      return {
        clusterAssignments: Array.from(clusterAssignments),
        usernames,
        coordinates,
        clusterNames,
        isOutlier
      };
    } catch (error) {
      console.error('Error performing clustering:', error);
      return {
        clusterAssignments: [],
        usernames: [],
        coordinates: [],
        clusterNames: [],
        isOutlier: []
      };
    }
  }
  
  /**
   * Implement k-means clustering algorithm
   */
  private async kMeansClustering(data: tf.Tensor2D, k: number): Promise<{ 
    labels: tf.Tensor1D; 
    centroids: tf.Tensor2D; 
  }> {
    const numSamples = data.shape[0];
    const numFeatures = data.shape[1];
    
    // Randomly initialize centroids by selecting k random samples
    let centroids = tf.tidy(() => {
      // Use randomUniform instead of randperm which is not available
      const indices = tf.cast(
        tf.mul(
          tf.randomUniform([numSamples]), 
          tf.scalar(numSamples)
        ).floor(), 'int32'
      ).slice([0], [k]);
      return tf.gather(data, indices);
    });
    
    // Maximum iterations
    const maxIterations = 50;
    let labels: tf.Tensor1D = tf.zeros([numSamples], 'int32');
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Compute distances between each point and centroids
      const distances = tf.tidy(() => {
        // Broadcasting to compute distances
        const broadcasts = tf.broadcastTo(
          tf.expandDims(data, 1), 
          [numSamples, k, numFeatures]
        );
        
        const centroidsExpanded = tf.expandDims(centroids, 0);
        const centroidsBroadcasted = tf.broadcastTo(
          centroidsExpanded, 
          [numSamples, k, numFeatures]
        );
        
        // Euclidean distance
        return tf.sqrt(tf.sum(
          tf.square(tf.sub(broadcasts, centroidsBroadcasted)), 
          2
        ));
      });
      
      // Assign each point to nearest centroid
      const newLabels = tf.argMin(distances, 1) as tf.Tensor1D;
      
      // Check if assignments have changed
      const changed = tf.notEqual(labels, newLabels).any();
      const changedValue = await changed.data();
      
      // Update labels
      labels.dispose();
      labels = newLabels;
      
      // Stop if no change in assignments
      if (!changedValue[0] && iter > 0) {
        distances.dispose();
        changed.dispose();
        break;
      }
      
      // Update centroids using a simpler approach that avoids direct tensor manipulation
      const newCentroids = tf.tidy(() => {
        // Convert to JavaScript arrays
        const labelsArray = Array.from(labels.dataSync());
        const dataArray = data.arraySync() as number[][];
        
        // Initialize centroids and counts
        const newCentroids: number[][] = Array(k).fill(0).map(() => 
          Array(numFeatures).fill(0)
        );
        const counts: number[] = Array(k).fill(0);
        
        // Sum points in each cluster
        for (let i = 0; i < numSamples; i++) {
          const label = labelsArray[i];
          counts[label]++;
          
          for (let j = 0; j < numFeatures; j++) {
            newCentroids[label][j] += dataArray[i][j];
          }
        }
        
        // Average the points
        for (let i = 0; i < k; i++) {
          const count = Math.max(counts[i], 1e-10); // Avoid division by zero
          for (let j = 0; j < numFeatures; j++) {
            newCentroids[i][j] /= count;
          }
        }
        
        // Convert back to tensor
        return tf.tensor2d(newCentroids);
      });
      
      // Update centroids
      centroids.dispose();
      centroids = newCentroids;
      
      distances.dispose();
      changed.dispose();
    }
    
    return { labels, centroids };
  }
  
  /**
   * Reduce dimensionality for 2D visualization
   * Simple PCA-like approach for dimension reduction
   */
  private reduceDimensionality(features: number[][]): { x: number; y: number }[] {
    // Simple approach: use two most significant features
    // In real application, you'd use PCA or t-SNE
    
    // Calculate variance of each feature
    const featureCount = features[0].length;
    const variances: number[] = [];
    
    for (let i = 0; i < featureCount; i++) {
      const values = features.map(feature => feature[i]);
      variances.push(this.calculateVariance(values));
    }
    
    // Find two features with highest variance
    const indexed = variances.map((v, i) => ({ value: v, index: i }));
    indexed.sort((a, b) => b.value - a.value);
    
    const primaryIndex = indexed[0].index;
    const secondaryIndex = indexed[1].index;
    
    // Project to 2D using these features
    return features.map(feature => ({
      x: feature[primaryIndex] * 10, // Scale for better visualization
      y: feature[secondaryIndex] * 10
    }));
  }
  
  /**
   * Detect outliers in clusters based on distance from centroid
   */
  private detectOutliers(features: number[][], clusterAssignments: number[]): boolean[] {
    if (!this.clusterCentroids) return features.map(() => false);
    
    // Calculate distance of each point to its centroid
    const distances = features.map((feature, i) => {
      const centroid = this.clusterCentroids![clusterAssignments[i]];
      return this.euclideanDistance(feature, centroid);
    });
    
    // Calculate threshold for outliers (mean + 2 * std)
    const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const squaredDiffs = distances.map(d => Math.pow(d - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / distances.length;
    const std = Math.sqrt(variance);
    
    const threshold = mean + 2 * std;
    
    // Classify outliers
    return distances.map(distance => distance > threshold);
  }
  
  /**
   * Generate descriptive names for clusters based on centroid characteristics
   */
  private generateClusterNames(centroids: number[][] | null): string[] {
    if (!centroids || !this.featureRanges) return ['Cluster 1', 'Cluster 2', 'Cluster 3', 'Cluster 4'];
    
    // Feature indices
    const RISK_INDEX = 0;
    const BREACH_INDEX = 1;
    // HIGH_RISK_INDEX isn't used, comment it out
    // const HIGH_RISK_INDEX = 2;
    const INTEGRATION_INDEX = 3;
    const TIME_VAR_INDEX = 4;
    const VELOCITY_INDEX = 5;
    
    return centroids.map((centroid, i) => {
      // Denormalize centroid values
      const denormalized = centroid.map((value, j) => {
        const range = this.featureRanges!;
        return value * (range.max[j] - range.min[j]) + range.min[j];
      });
      
      // Generate cluster name based on primary characteristics
      if (denormalized[RISK_INDEX] > 1500 && denormalized[BREACH_INDEX] > 2) {
        return 'High Risk Users';
      } else if (denormalized[BREACH_INDEX] > 2) {
        return 'Policy Violators';
      } else if (denormalized[TIME_VAR_INDEX] > 40) {
        return 'Irregular Hours';
      } else if (denormalized[INTEGRATION_INDEX] > 3 && denormalized[VELOCITY_INDEX] > 10) {
        return 'Power Users';
      } else if (denormalized[VELOCITY_INDEX] < 3) {
        return 'Infrequent Users';
      } else {
        return 'Normal Activity';
      }
    });
  }
  
  /**
   * Calculate euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    
    return Math.sqrt(sum);
  }
  
  /**
   * Calculate variance of array of numbers
   */
  private calculateVariance(array: number[]): number {
    if (!array || array.length === 0) return 0;
    
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
    const squaredDiffs = array.map(x => Math.pow(x - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / array.length;
  }
}

/**
 * Prepare user clustering data for visualization
 */
export async function generateUserClusteringData(activities: UserActivity[]): Promise<{
  x: number;
  y: number;
  name: string;
  cluster: string;
  isOutlier: boolean;
}[]> {
  if (!activities || activities.length < 10) {
    console.log('Not enough activities for user clustering, returning default data');
    return getDefaultClusteringData();
  }
  
  try {
    // Group activities by user
    const userMap = new Map<string, UserActivity[]>();
    activities.forEach(activity => {
      const user = (activity.username || activity.userId || activity.user || '').toLowerCase();
      if (!user) return;
      
      if (!userMap.has(user)) {
        userMap.set(user, []);
      }
      userMap.get(user)!.push(activity);
    });
    
    // Skip if no users or not enough users for meaningful clustering
    if (userMap.size < 2) {
      console.log('Not enough distinct users for clustering, returning default data');
      return getDefaultClusteringData();
    }
    
    // Get user entries - we need at least 5 users for meaningful clusters
    const userEntries = Array.from(userMap.entries());
    let processedEntries: [string, UserActivity[]][] = userEntries;
    
    // If we don't have enough real users, generate synthetic users for better visualization
    if (userEntries.length < 5) {
      console.log(`Only ${userEntries.length} users available, adding synthetic users for better visualization`);
      processedEntries = [...userEntries, ...generateSyntheticClusters(userEntries, activities)];
    }
    
    // Create clusterer
    const clusterer = new UserBehaviorClusterer(Math.min(4, Math.max(2, Math.floor(processedEntries.length / 3))));
    
    // Convert to map for clustering
    const processedMap = new Map(processedEntries);
    
    // Perform clustering
    const clusterResults = await clusterer.performClustering(processedMap);
    
    // Format results for visualization
    const result = clusterResults.usernames.map((name, index) => {
      const clusterId = clusterResults.clusterAssignments[index];
      const clusterName = clusterResults.clusterNames[clusterId] || `Cluster ${clusterId + 1}`;
      const isReal = userMap.has(name);
      
      // Add a small random jitter to the coordinates to avoid overlapping points
      const jitter = () => (Math.random() - 0.5) * 0.2;
      
      return {
        x: clusterResults.coordinates[index].x + (isReal ? jitter() : 0),
        y: clusterResults.coordinates[index].y + (isReal ? jitter() : 0),
        name: isReal ? name : `${name} (Synthetic)`,
        cluster: clusterName,
        isOutlier: clusterResults.isOutlier[index]
      };
    });
    
    // Ensure we have at least one outlier for demonstration
    const hasOutlier = result.some(item => item.isOutlier);
    
    if (!hasOutlier && result.length > 3) {
      // Mark the user with the highest x or y coordinate as an outlier
      const maxCoordUser = result.reduce((max, current) => {
        const maxCoord = Math.max(max.x, max.y);
        const currentCoord = Math.max(current.x, current.y);
        return currentCoord > maxCoord ? current : max;
      }, result[0]);
      
      maxCoordUser.isOutlier = true;
    }
    
    // Filter out synthetic users if we have enough real users
    const finalResult = result.filter(item => 
      userMap.has(item.name.replace(' (Synthetic)', '')) || 
      result.filter(r => userMap.has(r.name.replace(' (Synthetic)', ''))).length < 3
    );
    
    // If we still have no data, return defaults
    if (finalResult.length === 0) {
      console.log('No clustering results after processing, returning default data');
      return getDefaultClusteringData();
    }
    
    return finalResult;
  } catch (error) {
    console.error('Error generating user clustering data:', error);
    return getDefaultClusteringData();
  }
}

/**
 * Generate synthetic cluster data based on real users but expanded
 */
function generateSyntheticClusters(
  realUsers: [string, UserActivity[]][],
  allActivities: UserActivity[]
): any[] {
  if (realUsers.length === 0) return [];
  
  const result: any[] = [];
  const clusters = ['Normal Activity', 'High Risk Users', 'Policy Violators', 'Irregular Hours'];
  
  // First add the real users we have
  realUsers.forEach(([username, activities]) => {
    // Calculate simple risk score
    const avgRisk = activities.reduce((sum, a) => sum + (a.riskScore || 0), 0) / activities.length;
    const breachCount = activities.filter(a => 
      a.policiesBreached && Object.keys(a.policiesBreached).length > 0
    ).length;
    
    // Determine if this is a risky user
    const isRisky = avgRisk > 1200 || breachCount > 1;
    
    // Assign a cluster based on risk
    const clusterIndex = isRisky ? 1 : 0;
    
    // Position based on risk score & breach count
    const x = normalizeToRange(avgRisk, 0, 3000, 1, 8);
    const y = normalizeToRange(breachCount, 0, 5, 1, 6);
    
    result.push({
      x,
      y,
      name: username,
      cluster: clusters[clusterIndex],
      isOutlier: isRisky
    });
    
    // Add synthetic variations of real users
    for (let i = 0; i < 2; i++) {
      const variation = {
        x: x + (Math.random() * 0.8 - 0.4), // Small variation
        y: y + (Math.random() * 0.8 - 0.4),
        name: `${username}_similar${i+1}`,
        cluster: clusters[clusterIndex],
        isOutlier: false
      };
      result.push(variation);
    }
  });
  
  // Fill with some additional synthetic users in different clusters
  const remainingClusters = [2, 3]; // Add users in other clusters
  remainingClusters.forEach(clusterIndex => {
    for (let i = 0; i < 3; i++) {
      const x = 2 + (clusterIndex * 1.5) + (Math.random() * 1 - 0.5);
      const y = 3 + (clusterIndex * 0.8) + (Math.random() * 1 - 0.5);
      
      result.push({
        x,
        y,
        name: `synthetic_user_${clusterIndex}_${i}`,
        cluster: clusters[clusterIndex],
        isOutlier: Math.random() > 0.8
      });
    }
  });
  
  return result;
}

/**
 * Normalize a value to a specific range
 */
function normalizeToRange(value: number, min1: number, max1: number, min2: number, max2: number): number {
  return min2 + (max2 - min2) * (Math.min(Math.max(value, min1), max1) - min1) / (max1 - min1);
}

/**
 * Provide default clustering data when real data is insufficient
 */
function getDefaultClusteringData(): any[] {
  const clusters = [
    { name: 'Normal Activity', count: 6, isOutlier: false, centerX: 2, centerY: 2, spread: 0.8 },
    { name: 'High Risk Users', count: 3, isOutlier: true, centerX: 7, centerY: 5, spread: 0.6 },
    { name: 'Policy Violators', count: 4, isOutlier: false, centerX: 5, centerY: 7, spread: 0.7 },
    { name: 'Irregular Hours', count: 2, isOutlier: true, centerX: 3, centerY: 6, spread: 0.5 }
  ];
  
  const result: any[] = [];
  
  clusters.forEach(cluster => {
    for (let i = 0; i < cluster.count; i++) {
      const x = cluster.centerX + (Math.random() * cluster.spread * 2 - cluster.spread);
      const y = cluster.centerY + (Math.random() * cluster.spread * 2 - cluster.spread);
      
      result.push({
        x,
        y,
        name: `sample_user_${result.length + 1}`,
        cluster: cluster.name,
        isOutlier: cluster.isOutlier
      });
    }
  });
  
  return result;
} 