import { loadActivityData, prepareFeatures, analyzeActivityData } from '@/lib/data/csvParser';
import { AnomalyDetector } from '@/lib/ml/anomalyDetector';
import { RecommendationEngine } from '@/lib/ml/recommendationEngine';
import * as tf from '@tensorflow/tfjs';

// Cache for performance optimization
let cachedResult = null;
let lastAnalysisTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Mock data for demonstration
const mockData = {
  stats: {
    totalActivities: 150,
    anomalyCount: 12,
    recommendationCount: 8
  },
  recommendations: [
    {
      id: 1,
      title: "Unusual Login Pattern",
      description: "Multiple login attempts detected from different locations",
      severity: "high",
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      title: "Data Access Anomaly",
      description: "Unusual data access pattern detected during off-hours",
      severity: "medium",
      timestamp: new Date().toISOString()
    }
  ],
  anomalies: [
    {
      id: 1,
      type: "login",
      timestamp: new Date().toISOString(),
      details: "Multiple failed login attempts",
      riskScore: 0.85
    },
    {
      id: 2,
      type: "data_access",
      timestamp: new Date().toISOString(),
      details: "Unusual data access pattern",
      riskScore: 0.65
    }
  ]
};

export async function runMachineLearningAnalysis() {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedResult && (now - lastAnalysisTimestamp) < CACHE_DURATION) {
      console.log('Returning cached analysis results');
      return cachedResult;
    }
    
    // Load and prepare data
    const activities = await loadActivityData();
    const processedActivities = prepareFeatures(activities);
    
    // Initialize ML components
    const anomalyDetector = new AnomalyDetector();
    const recommendationEngine = new RecommendationEngine();
    
    // Train anomaly detector
    anomalyDetector.train(processedActivities);
    
    // Detect anomalies
    const anomalies = anomalyDetector.detectAnomalies(processedActivities);
    
    // Generate recommendations
    const recommendations = recommendationEngine.generateRecommendations(anomalies);
    
    // Group recommendations by category and severity
    const recommendationsByCategory = recommendationEngine.getRecommendationsByCategory(recommendations);
    const recommendationsBySeverity = recommendationEngine.getRecommendationsBySeverity(recommendations);
    
    // Calculate statistics
    const stats = {
      totalActivities: processedActivities.length,
      anomalyCount: anomalies.filter(a => a.isAnomaly).length,
      recommendationCount: recommendations.length,
      highSeverityCount: recommendations.filter(r => r.severity === 'high').length,
      mediumSeverityCount: recommendations.filter(r => r.severity === 'medium').length,
      lowSeverityCount: recommendations.filter(r => r.severity === 'low').length
    };
    
    // Prepare the result
    const result = {
      stats,
      recommendations,
      recommendationsByCategory,
      recommendationsBySeverity,
      anomalies: anomalies.filter(a => a.isAnomaly),
      timestamp: now
    };
    
    // Update cache
    cachedResult = result;
    lastAnalysisTimestamp = now;
    
    return result;
  } catch (error) {
    console.error('Error in ML analysis:', error);
    throw new Error('Failed to run machine learning analysis');
  }
}

// Helper function to calculate threshold based on percentile
function calculateThreshold(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  
  const index = Math.floor(sortedValues.length * percentile);
  return sortedValues[index];
}

// Export a function to clear the cache if needed
export function clearAnalysisCache() {
  cachedResult = null;
  lastAnalysisTimestamp = 0;
  console.log('Analysis cache cleared');
}

export async function runMachineLearningAnalysisMock() {
  try {
    // For now, return mock data
    return mockData;
  } catch (error) {
    console.error('Error in ML analysis:', error);
    throw new Error('Failed to run machine learning analysis');
  }
} 