import * as tf from '@tensorflow/tfjs';

export class UserBehaviorClustering {
  constructor(numClusters = 4) {
    this.numClusters = numClusters;
    this.model = null;
    this.featureNames = ['riskScore', 'timeOfDay', 'frequency', 'activityType'];
  }

  preprocessData(activities) {
    // Convert activities to feature vectors
    const features = activities.map(activity => {
      const timeOfDay = new Date(`${activity.date} ${activity.time}`).getHours() / 24;
      return [
        activity.riskScore / 3000, // Normalize risk score
        timeOfDay, // Time of day (0-1)
        activity.frequency || 0, // Activity frequency
        this.encodeActivityType(activity.integration) // Encoded activity type
      ];
    });

    return tf.tensor2d(features);
  }

  encodeActivityType(type) {
    // Simple encoding of activity types
    const types = ['download', 'upload', 'access', 'modify'];
    return types.indexOf(type) / types.length;
  }

  async train(activities) {
    const data = this.preprocessData(activities);
    
    // Initialize centroids randomly
    const centroids = tf.randomUniform([this.numClusters, this.featureNames.length]);
    
    // K-means clustering
    const iterations = 50;
    let assignments;
    
    for (let i = 0; i < iterations; i++) {
      // Calculate distances to centroids
      const distances = tf.tidy(() => {
        return tf.sum(
          tf.square(
            tf.sub(
              tf.expandDims(data, 1),
              tf.expandDims(centroids, 0)
            )
          ),
          2
        );
      });
      
      // Assign points to nearest centroid
      assignments = tf.argMin(distances, 1);
      
      // Update centroids
      const newCentroids = [];
      for (let j = 0; j < this.numClusters; j++) {
        const mask = tf.equal(assignments, j);
        const points = tf.booleanMask(data, mask);
        if (points.shape[0] > 0) {
          newCentroids.push(tf.mean(points, 0));
        } else {
          newCentroids.push(centroids.slice(j, 1));
        }
      }
      
      centroids.dispose();
      tf.dispose(distances);
      
      // Update centroids tensor
      centroids = tf.stack(newCentroids);
    }

    this.model = {
      centroids: centroids,
      assignments: assignments
    };

    return this.model;
  }

  predict(activity) {
    const features = this.preprocessData([activity]);
    const distances = tf.sum(
      tf.square(
        tf.sub(
          tf.expandDims(features, 1),
          tf.expandDims(this.model.centroids, 0)
        )
      ),
      2
    );
    return tf.argMin(distances, 1).dataSync()[0];
  }

  getClusterInsights(activities) {
    const assignments = this.model.assignments.dataSync();
    const clusters = {};
    
    activities.forEach((activity, index) => {
      const cluster = assignments[index];
      if (!clusters[cluster]) {
        clusters[cluster] = {
          count: 0,
          avgRiskScore: 0,
          commonTimes: new Set(),
          commonTypes: new Set()
        };
      }
      
      clusters[cluster].count++;
      clusters[cluster].avgRiskScore += activity.riskScore;
      clusters[cluster].commonTimes.add(new Date(`${activity.date} ${activity.time}`).getHours());
      clusters[cluster].commonTypes.add(activity.integration);
    });

    // Calculate averages and format insights
    return Object.entries(clusters).map(([cluster, data]) => ({
      clusterId: parseInt(cluster),
      size: data.count,
      avgRiskScore: data.avgRiskScore / data.count,
      activeHours: Array.from(data.commonTimes),
      activityTypes: Array.from(data.commonTypes),
      description: this.generateClusterDescription(data)
    }));
  }

  generateClusterDescription(clusterData) {
    const riskLevel = clusterData.avgRiskScore > 2000 ? 'high' :
                     clusterData.avgRiskScore > 1000 ? 'medium' : 'low';
    
    const timePattern = this.analyzeTimePattern(Array.from(clusterData.commonTimes));
    const activities = Array.from(clusterData.commonTypes).join(', ');

    return `${clusterData.count} users with ${riskLevel} risk, primarily active ${timePattern}, performing ${activities} activities`;
  }

  analyzeTimePattern(hours) {
    if (hours.every(h => h >= 9 && h <= 17)) return 'during business hours';
    if (hours.every(h => h < 9 || h > 17)) return 'outside business hours';
    return 'throughout the day';
  }
} 