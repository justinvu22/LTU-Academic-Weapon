import * as tf from '@tensorflow/tfjs';
import { UserActivity } from '../../types/activity';

/**
 * Interface for heatmap cell data
 */
export interface HeatmapCell {
  hour: number;
  integration: string;
  count: number;
  score: number;
  intensity: number;
}

/**
 * Risk Pattern Heatmap Analyzer
 * Uses unsupervised learning to identify risk hotspots in time x integration space
 */
export class RiskHeatmapAnalyzer {
  private model: tf.Sequential | null = null;
  private isModelTrained: boolean = false;
  private integrations: string[] = ['email', 'cloud', 'usb', 'application', 'file', 'other'];
  private hourBins: number = 24; // 24 hours
  
  constructor() {
    // Build model
    this.buildModel();
  }
  
  /**
   * Build autoencoder model for anomaly detection in time x integration space
   */
  private buildModel(): void {
    try {
      // Input dimensions: integrations x hours
      const inputDim = this.integrations.length * this.hourBins;
      
      // Create model
      const model = tf.sequential();
      
      // Encoder layers
      model.add(tf.layers.dense({
        inputShape: [inputDim],
        units: Math.floor(inputDim / 2),
        activation: 'relu'
      }));
      
      // Bottleneck
      model.add(tf.layers.dense({
        units: Math.floor(inputDim / 4),
        activation: 'relu'
      }));
      
      // Decoder layers
      model.add(tf.layers.dense({
        units: Math.floor(inputDim / 2),
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
    } catch (error) {
      console.error('Error building heatmap model:', error);
    }
  }
  
  /**
   * Create initial heatmap grid from activities
   */
  public createHeatmapGrid(activities: UserActivity[]): HeatmapCell[] {
    // Initialize empty grid
    const cells: HeatmapCell[] = [];
    
    for (let i = 0; i < this.integrations.length; i++) {
      for (let h = 0; h < this.hourBins; h++) {
        cells.push({
          integration: this.integrations[i],
          hour: h,
          count: 0,
          score: 0,
          intensity: 0
        });
      }
    }
    
    // Populate with activity data
    activities.forEach(activity => {
      // Extract hour
      let hour: number;
      if (activity.timestamp) {
        hour = new Date(activity.timestamp).getHours();
      } else if (activity.time) {
        const timeParts = activity.time.split(':');
        if (timeParts.length >= 1) {
          hour = parseInt(timeParts[0], 10);
        } else {
          return; // Skip if no valid hour
        }
      } else {
        return; // Skip if no time data
      }
      
      // Determine integration type
      let integrationType = 'other';
      if (activity.integration) {
        const integration = activity.integration.toLowerCase();
        if (integration.includes('email')) integrationType = 'email';
        else if (integration.includes('cloud')) integrationType = 'cloud';
        else if (integration.includes('usb')) integrationType = 'usb';
        else if (integration.includes('app')) integrationType = 'application';
        else if (integration.includes('file')) integrationType = 'file';
      }
      
      // Find cell index
      const integrationIndex = this.integrations.indexOf(integrationType);
      const cellIndex = (integrationIndex * this.hourBins) + hour;
      
      if (cellIndex >= 0 && cellIndex < cells.length) {
        cells[cellIndex].count += 1;
        cells[cellIndex].score += (activity.riskScore || 0);
      }
    });
    
    return cells;
  }
  
  /**
   * Train model to identify anomalous patterns in the heatmap
   */
  async trainModel(activities: UserActivity[]): Promise<boolean> {
    if (!this.model || activities.length < 20) {
      return false;
    }
    
    try {
      // Create grid and extract features
      const cells = this.createHeatmapGrid(activities);
      const features = this.gridToFeatures(cells);
      
      // Convert to tensor
      const featureTensor = tf.tensor2d([features]);
      
      // Train autoencoder
      await this.model.fit(featureTensor, featureTensor, {
        epochs: 100,
        batchSize: 1,
        shuffle: true,
        verbose: 0
      });
      
      // Clean up
      featureTensor.dispose();
      
      this.isModelTrained = true;
      return true;
    } catch (error) {
      console.error('Error training heatmap model:', error);
      return false;
    }
  }
  
  /**
   * Convert grid cells to feature vector
   */
  private gridToFeatures(cells: HeatmapCell[]): number[] {
    // Normalize counts
    const maxCount = Math.max(...cells.map(cell => cell.count));
    
    // Create feature vector with normalized counts for each cell
    return cells.map(cell => maxCount > 0 ? cell.count / maxCount : 0);
  }
  
  /**
   * Calculate anomaly scores for each cell
   */
  async analyzeHeatmap(cells: HeatmapCell[]): Promise<HeatmapCell[]> {
    if (!this.model || !this.isModelTrained) {
      // If model not trained, just normalize intensities
      return this.normalizeIntensities(cells);
    }
    
    try {
      // Convert grid to features
      const features = this.gridToFeatures(cells);
      
      // Get tensor
      const featureTensor = tf.tensor2d([features]);
      
      // Get reconstruction
      const output = this.model.predict(featureTensor) as tf.Tensor;
      
      // Calculate reconstruction errors (cell-level anomaly scores)
      const reconstruction = await output.array();
      const errors = features.map((value, i) => 
        Math.pow(value - (reconstruction as number[][])[0][i], 2)
      );
      
      // Normalize error scores
      const maxError = Math.max(...errors);
      const anomalyScores = errors.map(error => 
        maxError > 0 ? error / maxError : 0
      );
      
      // Update cell intensity based on both count and anomaly score
      const processed = [...cells].map((cell, i) => {
        // Calculate total risk
        const baseIntensity = (cell.score > 0 && cell.count > 0) ? 
          (cell.score / cell.count) / 3000 : 0;
        
        // Enhance with anomaly score
        const anomalyScore = anomalyScores[i];
        const enhancedIntensity = baseIntensity * (1 + anomalyScore * 2);
        
        return {
          ...cell,
          intensity: Math.min(enhancedIntensity, 1) // Cap at 1
        };
      });
      
      // Clean up
      featureTensor.dispose();
      output.dispose();
      
      return processed;
    } catch (error) {
      console.error('Error analyzing heatmap:', error);
      return this.normalizeIntensities(cells);
    }
  }
  
  /**
   * Simple intensity calculation if ML model is not available
   */
  private normalizeIntensities(cells: HeatmapCell[]): HeatmapCell[] {
    // Calculate max score
    const maxScore = Math.max(...cells.map(cell => cell.score));
    
    // Normalize intensities
    return cells.map(cell => ({
      ...cell,
      intensity: maxScore > 0 ? cell.score / maxScore : 0
    }));
  }
}

/**
 * Generate risk pattern heatmap data for visualization
 */
export async function generateHeatmapData(activities: UserActivity[]): Promise<HeatmapCell[]> {
  if (!activities || activities.length < 10) {
    return [];
  }
  
  try {
    // Create and train heatmap analyzer
    const analyzer = new RiskHeatmapAnalyzer();
    
    // Create initial grid
    const initialGrid = analyzer.createHeatmapGrid(activities);
    
    // If we have enough data, train model and enhance grid with ML insights
    if (activities.length >= 20) {
      const trained = await analyzer.trainModel(activities);
      
      if (trained) {
        return await analyzer.analyzeHeatmap(initialGrid);
      }
    }
    
    // Fall back to basic analysis if training fails or insufficient data
    return analyzer.analyzeHeatmap(initialGrid);
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return [];
  }
} 