'use client';

import { useState } from 'react';
import { SettingsProvider } from '../context/SettingsContext';
import StatCards from '../components/ml/StatCards';
import RecommendationList from '../components/ml/RecommendationList';
import AnomalyTable from '../components/ml/AnomalyTable';
import ChartControls from '../components/ml/ChartControls';
import FileUpload from '../components/FileUpload';
import ChartCustomizer from '../components/ChartCustomizer';
import Alerts from '../components/Alerts';
import ExportControls from '../components/ExportControls';
import { RecommendationEngine } from '../lib/ml/recommendationEngine';
import { AnomalyDetector } from '../lib/ml/anomalyDetector';

export default function MLTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);

  const handleDataLoaded = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize ML components
      const anomalyDetector = new AnomalyDetector();
      const recommendationEngine = new RecommendationEngine();

      // Prepare initial data
      const activities = data.map(activity => ({
        ...activity,
        // Ensure riskScore is a number
        riskScore: Number(activity.riskScore) || 0,
        // Convert date and time to timestamp
        timestamp: new Date(`${activity.date} ${activity.time}`),
        // Parse JSON fields if they're strings
        policiesBreached: typeof activity.policiesBreached === 'string' ? 
          JSON.parse(activity.policiesBreached) : activity.policiesBreached,
        values: typeof activity.values === 'string' ? 
          JSON.parse(activity.values) : activity.values
      }));

      // Train anomaly detector and detect anomalies
      anomalyDetector.train(activities);
      const detectedAnomalies = anomalyDetector.detectAnomalies(activities);

      // Generate recommendations based on detected anomalies
      const recommendations = recommendationEngine.generateRecommendations(detectedAnomalies);
      
      // Prepare the processed data
      const processedData = {
        stats: {
          totalActivities: activities.length,
          anomalyCount: detectedAnomalies.filter(a => a.isAnomaly).length,
          recommendationCount: recommendations.length
        },
        anomalies: detectedAnomalies,
        recommendations,
        recommendationsByCategory: recommendationEngine.getRecommendationsByCategory(recommendations),
        recommendationsBySeverity: recommendationEngine.getRecommendationsBySeverity(recommendations)
      };

      setResults(processedData);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Error analyzing data: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrillDown = (dataPoint) => {
    setSelectedDataPoint(dataPoint);
  };

  return (
    <SettingsProvider>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">ShadowSight Dashboard</h1>

        <FileUpload onDataLoaded={handleDataLoaded} />
        
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
        
        {loading && (
          <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
            Processing data...
          </div>
        )}
        
        {results && (
          <div className="space-y-8">
            <StatCards 
              totalActivities={results.stats.totalActivities}
              anomalyCount={results.stats.anomalyCount}
              recommendationCount={results.stats.recommendationCount}
            />
            
            <Alerts anomalies={results.anomalies} />
            
            <ChartCustomizer 
              data={results.anomalies}
              onDrillDown={handleDrillDown}
            />
            
            <ChartControls anomalies={results.anomalies} />
            
            <RecommendationList 
              recommendations={results.recommendations}
              recommendationsByCategory={results.recommendationsByCategory}
              recommendationsBySeverity={results.recommendationsBySeverity}
            />
            
            <AnomalyTable anomalies={results.anomalies} />

            <ExportControls 
              charts={['timelineChart', 'userActivityChart', 'riskDistributionChart']}
              data={results.anomalies}
            />
          </div>
        )}
      </div>
    </SettingsProvider>
  );
} 