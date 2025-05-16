// app/ml/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Card, CardContent, Chip, Tooltip as MuiTooltip } from '@mui/material';
import { FaExclamationTriangle } from 'react-icons/fa';
import { RecommendationEngine } from '../../ml/recommendationEngine';
import { UserActivity, MLRecommendation } from '../../types/activity';

export default function MLPage() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        // Attempt to get data from API
        const response = await fetch('/api/activities');
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities data');
        }
        
        const data = await response.json();
        
        if (data.activities && data.activities.length > 0) {
          setActivities(data.activities);
          
          // Use our ML recommendation engine
          const engine = new RecommendationEngine({
            sensitivityLevel: 'medium',
            confidenceThreshold: 0.65,
            maxRecommendations: 20,
            useAdvancedAnalysis: true,
          });
          
          const mlRecommendations = engine.generateRecommendations(data.activities);
          setRecommendations(mlRecommendations);
          
          setError(null);
        } else {
          setActivities([]);
          setError('No activity data found');
        }
      } catch (err) {
        console.error('Error loading activities:', err);
        setError('Failed to load activities data');
        
        // Fallback to check localStorage if API fails
        try {
          const storedData = localStorage.getItem('processedActivityData');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              setActivities(parsedData);
              
              // Use our ML recommendation engine
              const engine = new RecommendationEngine();
              const mlRecommendations = engine.generateRecommendations(parsedData);
              setRecommendations(mlRecommendations);
              
              setError(null);
            }
          }
        } catch (localErr) {
          console.error('Error loading from localStorage:', localErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Get severity color for recommendations
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format confidence percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Group recommendations by category
  const groupedRecommendations = recommendations.reduce((acc, recommendation) => {
    const category = recommendation.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(recommendation);
    return acc;
  }, {} as Record<string, MLRecommendation[]>);

  // Get friendly name for category
  const getCategoryName = (category: string): string => {
    switch (category) {
      case 'data_exfiltration': return 'Data Exfiltration';
      case 'unusual_behavior': return 'Unusual Behavior';
      case 'policy_breach': return 'Policy Breaches';
      case 'access_violation': return 'Access Violations';
      case 'suspicious_timing': return 'Suspicious Timing';
      case 'bulk_operations': return 'Bulk Operations';
      case 'high_risk_sequence': return 'High Risk Sequences';
      default: return 'Other Insights';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8f8f8] text-gray-800 p-6">
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-semibold">ML-Powered Security Insights</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <CircularProgress />
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
          <p className="mt-2">Please upload activity data to get ML insights.</p>
        </div>
      ) : (
        <div>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold">{recommendations.length}</div>
              <div className="text-sm opacity-80">Total Insights</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold">
                {recommendations.filter(r => r.severity === 'critical' || r.severity === 'high').length}
              </div>
              <div className="text-sm opacity-80">High Priority</div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold">
                {recommendations.filter(r => r.severity === 'medium').length}
              </div>
              <div className="text-sm opacity-80">Medium Priority</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 text-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold">
                {Object.keys(groupedRecommendations).length}
              </div>
              <div className="text-sm opacity-80">Categories</div>
            </div>
          </div>

          {/* ML Recommendations by Category */}
          {recommendations.length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedRecommendations).map(([category, categoryRecommendations]) => (
                <div key={category} className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                    {getCategoryName(category)}
                  </h2>
                  <div className="space-y-4">
                    {categoryRecommendations.map((rec) => (
                      <div key={rec.id} className={`border p-4 rounded-md shadow-sm ${getSeverityColor(rec.severity)}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{rec.title}</h3>
                            <p className="text-sm mt-1">{rec.description}</p>
                            
                            <div className="mt-3">
                              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Recommended Actions:</h4>
                              <ul className="list-disc pl-5 text-sm">
                                {rec.suggestedActions.map((action, i) => (
                                  <li key={i}>{action}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500">
                              Affected Users: {rec.affectedUsers.join(', ')}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end">
                            <MuiTooltip title="Confidence Score">
                              <Chip 
                                label={formatConfidence(rec.confidence)} 
                                size="small"
                                className="mb-2"
                                color={rec.confidence > 0.8 ? "error" : rec.confidence > 0.6 ? "warning" : "info"}
                              />
                            </MuiTooltip>
                            <div className="text-xs text-gray-500">
                              {new Date(rec.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-6xl text-gray-300 mb-4 flex justify-center">
                <FaExclamationTriangle />
              </div>
              <h2 className="text-xl font-semibold mb-2">No ML Insights Available</h2>
              <p className="text-gray-600">
                Upload activity data or load pre-existing data to generate ML-powered security insights.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
  