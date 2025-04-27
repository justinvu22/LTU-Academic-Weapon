import * as tf from '@tensorflow/tfjs';

export class RiskPredictor {
  constructor() {
    this.model = null;
    this.featureNames = ['timeOfDay', 'dayOfWeek', 'activityType', 'userHistory'];
  }

  async createModel() {
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      inputShape: [this.featureNames.length]
    }));
    
    // Hidden layer
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    
    // Output layer (risk score prediction)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'  // Output between 0 and 1
    }));
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['accuracy']
    });
    
    this.model = model;
    return model;
  }

  preprocessData(activities) {
    const features = activities.map(activity => {
      const date = new Date(`${activity.date} ${activity.time}`);
      return [
        date.getHours() / 24, // Time of day (normalized)
        date.getDay() / 6, // Day of week (normalized)
        this.encodeActivityType(activity.integration),
        this.calculateUserRiskHistory(activity.user) // Historical risk factor
      ];
    });

    const labels = activities.map(activity => 
      activity.riskScore / 3000 // Normalize risk scores
    );

    return {
      features: tf.tensor2d(features),
      labels: tf.tensor1d(labels)
    };
  }

  encodeActivityType(type) {
    const types = ['download', 'upload', 'access', 'modify'];
    return types.indexOf(type) / types.length;
  }

  calculateUserRiskHistory(user) {
    // This would normally use historical data
    // For now, return a random value between 0 and 1
    return Math.random();
  }

  async train(activities, epochs = 50) {
    if (!this.model) {
      await this.createModel();
    }

    const { features, labels } = this.preprocessData(activities);
    
    // Train the model
    const history = await this.model.fit(features, labels, {
      epochs: epochs,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
        }
      }
    });

    return history;
  }

  async predict(activity) {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    const features = this.preprocessData([activity]).features;
    const prediction = await this.model.predict(features).data();
    
    return {
      predictedRiskScore: prediction[0] * 3000, // Denormalize
      confidence: this.calculateConfidence(prediction[0])
    };
  }

  calculateConfidence(prediction) {
    // Simple confidence calculation based on distance from 0.5
    return Math.abs(0.5 - prediction) * 2;
  }

  async predictBatch(activities) {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    const features = this.preprocessData(activities).features;
    const predictions = await this.model.predict(features).data();
    
    return activities.map((activity, i) => ({
      activity,
      predictedRiskScore: predictions[i] * 3000,
      confidence: this.calculateConfidence(predictions[i])
    }));
  }

  generateRiskInsights(predictions) {
    const highRiskPredictions = predictions.filter(p => p.predictedRiskScore > 2000);
    const mediumRiskPredictions = predictions.filter(p => p.predictedRiskScore > 1000 && p.predictedRiskScore <= 2000);
    
    return {
      summary: {
        totalPredictions: predictions.length,
        highRiskCount: highRiskPredictions.length,
        mediumRiskCount: mediumRiskPredictions.length,
        averageConfidence: predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length
      },
      highRiskActivities: highRiskPredictions.map(p => ({
        user: p.activity.user,
        activity: p.activity.integration,
        predictedRisk: p.predictedRiskScore,
        confidence: p.confidence
      })),
      riskFactors: this.analyzeRiskFactors(predictions)
    };
  }

  analyzeRiskFactors(predictions) {
    const factors = {
      timeOfDay: new Map(),
      activityType: new Map(),
      dayOfWeek: new Map()
    };

    predictions.forEach(p => {
      const date = new Date(`${p.activity.date} ${p.activity.time}`);
      const hour = date.getHours();
      const day = date.getDay();
      const type = p.activity.integration;

      // Update time of day factors
      factors.timeOfDay.set(hour, (factors.timeOfDay.get(hour) || 0) + p.predictedRiskScore);
      
      // Update activity type factors
      factors.activityType.set(type, (factors.activityType.get(type) || 0) + p.predictedRiskScore);
      
      // Update day of week factors
      factors.dayOfWeek.set(day, (factors.dayOfWeek.get(day) || 0) + p.predictedRiskScore);
    });

    return {
      riskyHours: Array.from(factors.timeOfDay.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour, risk]) => ({ hour, risk })),
      riskyActivities: Array.from(factors.activityType.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, risk]) => ({ type, risk })),
      riskyDays: Array.from(factors.dayOfWeek.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([day, risk]) => ({ 
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day], 
          risk 
        }))
    };
  }
} 