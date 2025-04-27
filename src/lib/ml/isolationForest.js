class IsolationTree {
  constructor(height_limit) {
    this.height_limit = height_limit;
    this.size = 0;
    this.root = null;
  }

  fit(X, height = 0) {
    this.size = X.length;
    if (height >= this.height_limit || this.size <= 1) {
      this.root = { type: 'external', size: this.size };
      return this;
    }

    const features = Object.keys(X[0]);
    const splitFeature = features[Math.floor(Math.random() * features.length)];
    const featureValues = X.map(x => x[splitFeature]);
    const minVal = Math.min(...featureValues);
    const maxVal = Math.max(...featureValues);

    if (minVal === maxVal) {
      this.root = { type: 'external', size: this.size };
      return this;
    }

    const splitValue = minVal + Math.random() * (maxVal - minVal);
    const left = X.filter(x => x[splitFeature] < splitValue);
    const right = X.filter(x => x[splitFeature] >= splitValue);

    this.root = {
      type: 'internal',
      splitFeature,
      splitValue,
      left: new IsolationTree(this.height_limit).fit(left, height + 1),
      right: new IsolationTree(this.height_limit).fit(right, height + 1)
    };

    return this;
  }

  pathLength(x, node = this.root, height = 0) {
    if (node.type === 'external') {
      return height + c(node.size);
    }

    const nextNode = x[node.splitFeature] < node.splitValue ? node.left : node.right;
    return this.pathLength(x, nextNode.root, height + 1);
  }
}

function c(n) {
  if (n <= 1) return 0;
  const h = Math.log(n - 1) + 0.5772156649; // Euler's constant
  return 2 * h - (2 * (n - 1) / n);
}

export class IsolationForest {
  constructor(n_trees = 100, sample_size = 256) {
    this.n_trees = n_trees;
    this.sample_size = sample_size;
    this.trees = [];
    this.c = 0;
  }

  preprocessData(activities) {
    return activities.map(activity => ({
      riskScore: activity.riskScore / 3000, // Normalize risk score
      hour: new Date(`${activity.date} ${activity.time}`).getHours() / 24,
      dayOfWeek: new Date(`${activity.date} ${activity.time}`).getDay() / 6,
      activityType: this.encodeActivityType(activity.integration)
    }));
  }

  encodeActivityType(type) {
    const types = ['download', 'upload', 'access', 'modify'];
    return types.indexOf(type) / types.length;
  }

  fit(activities) {
    const data = this.preprocessData(activities);
    const heightLimit = Math.ceil(Math.log2(this.sample_size));
    
    for (let i = 0; i < this.n_trees; i++) {
      // Sample data randomly
      const sample = [];
      for (let j = 0; j < this.sample_size; j++) {
        const idx = Math.floor(Math.random() * data.length);
        sample.push(data[idx]);
      }
      
      const tree = new IsolationTree(heightLimit);
      tree.fit(sample);
      this.trees.push(tree);
    }
    
    this.c = c(this.sample_size);
    return this;
  }

  predict(activities) {
    const data = this.preprocessData(Array.isArray(activities) ? activities : [activities]);
    return data.map(point => {
      const scores = this.trees.map(tree => tree.pathLength(point));
      const avgScore = scores.reduce((a, b) => a + b, 0) / this.n_trees;
      const anomalyScore = Math.pow(2, -avgScore / this.c);
      return {
        isAnomaly: anomalyScore > 0.6, // Threshold can be adjusted
        anomalyScore,
        confidence: Math.abs(0.5 - anomalyScore) * 2
      };
    });
  }

  generateAnomalyInsights(activities) {
    const predictions = this.predict(activities);
    const results = activities.map((activity, i) => ({
      ...activity,
      ...predictions[i]
    }));

    const anomalies = results.filter(r => r.isAnomaly);
    
    return {
      summary: {
        totalActivities: activities.length,
        anomalyCount: anomalies.length,
        anomalyRate: anomalies.length / activities.length,
        averageConfidence: predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length
      },
      anomalies: anomalies.map(a => ({
        user: a.user,
        activity: a.integration,
        time: `${a.date} ${a.time}`,
        riskScore: a.riskScore,
        anomalyScore: a.anomalyScore,
        confidence: a.confidence
      })),
      patterns: this.analyzeAnomalyPatterns(anomalies)
    };
  }

  analyzeAnomalyPatterns(anomalies) {
    const patterns = {
      timeOfDay: new Map(),
      users: new Map(),
      activities: new Map()
    };

    anomalies.forEach(a => {
      const hour = new Date(`${a.date} ${a.time}`).getHours();
      
      // Track time patterns
      patterns.timeOfDay.set(hour, (patterns.timeOfDay.get(hour) || 0) + 1);
      
      // Track user patterns
      patterns.users.set(a.user, (patterns.users.get(a.user) || 0) + 1);
      
      // Track activity patterns
      patterns.activities.set(a.integration, (patterns.activities.get(a.integration) || 0) + 1);
    });

    return {
      suspiciousHours: Array.from(patterns.timeOfDay.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour, count]) => ({
          hour,
          count,
          description: this.getTimeDescription(hour)
        })),
      highRiskUsers: Array.from(patterns.users.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([user, count]) => ({ user, anomalyCount: count })),
      riskyActivities: Array.from(patterns.activities.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([activity, count]) => ({ activity, count }))
    };
  }

  getTimeDescription(hour) {
    if (hour < 5) return 'Early morning (unusual)';
    if (hour < 9) return 'Before business hours';
    if (hour < 17) return 'Business hours';
    if (hour < 20) return 'After business hours';
    return 'Late night (unusual)';
  }
} 