// app/ml/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Card, CardContent, Chip, Tooltip as MuiTooltip, LinearProgress, Button } from '@mui/material';
import { FaExclamationTriangle, FaLightbulb } from 'react-icons/fa';
import { RecommendationEngine } from '../../ml/recommendationEngine';
import { UserActivity, MLRecommendation } from '../../types/activity';
import { useAdaptiveProcessing } from '../../hooks/useAdaptiveProcessing';
import threatLearner from '../../utils/threatLearner';
import adaptiveConfig from '../../utils/adaptiveConfig';
import Link from 'next/link';

export default function MLPage() {
  // State for loading stored activities
  const [storedActivities, setStoredActivities] = useState<UserActivity[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Use adaptive processing hook for optimized data loading
  const {
    activities,
    normalizedCount,
    isProcessing,
    error: dataLoadError,
    performanceMetrics,
    mlResults,
    mlProgress,
    mlIsProcessing,
    mlError
  } = useAdaptiveProcessing(storedActivities); // Pass stored activities once loaded
  
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPhase, setProcessingPhase] = useState('initializing');
  const [learnedPatterns, setLearnedPatterns] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  // Load activities data from storage on component mount
  useEffect(() => {
    const loadActivitiesData = async () => {
      try {
        setIsLoadingData(true);
        setProcessingPhase('loading-data');
        
        // Load activities from IndexedDB only
        const { getActivitiesFromIndexedDB } = await import('../../utils/storage');
        
        try {
          const activitiesData = await getActivitiesFromIndexedDB();
          console.log(`Loaded ${activitiesData.length} activities from storage for ML analysis`);
          
          if (activitiesData.length === 0) {
            setDataError('No activity data available. Please upload data from the Upload page first.');
            setIsLoadingData(false);
            setLoading(false);
            return;
          }
          
          // Set the loaded activities to state to trigger processing
          setStoredActivities(activitiesData);
          setIsLoadingData(false);
        } catch (storageError) {
          console.error('Error accessing IndexedDB:', storageError);
          setDataError('Error accessing data storage. Please try uploading data again.');
          setIsLoadingData(false);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading activities data:', err);
        setDataError('Error loading activity data. Please try refreshing the page.');
        setIsLoadingData(false);
        setLoading(false);
      }
    };
    
    loadActivitiesData();
  }, []);
  
  // Enhanced ML processing with performance tracking and caching
  useEffect(() => {
    const processMLInsights = async () => {
      try {
        if (!activities || activities.length === 0) {
          // Don't try to process if we don't have activities
          if (!isProcessing && !isLoadingData) {
            setLoading(false);
            setError(dataLoadError || dataError || 'No activity data available. Please upload data first.');
          }
          return;
        }
        
        setLoading(true);
        setProcessingPhase('analyzing-data');
        
        // Check if we have cached recommendations in localStorage
        const activityHash = hashActivities(activities);
        const cachedRecommendationsKey = `ml_recommendations_${activityHash}`;
        const cachedResults = localStorage.getItem(cachedRecommendationsKey);
        
        if (cachedResults) {
          try {
            const parsedCache = JSON.parse(cachedResults);
            if (parsedCache && Array.isArray(parsedCache) && parsedCache.length > 0) {
              console.log('Using cached ML recommendations');
              setRecommendations(parsedCache);
              setProcessingPhase('using-cached-results');
              setLoading(false);
              setProcessingComplete(true);
              return;
            }
          } catch (cacheError) {
            console.warn('Error parsing cached recommendations:', cacheError);
          }
        }
        
        // If no cache, go through full processing
        setProcessingPhase('analyzing-patterns');
        
        // Use our threat learner to discover new patterns
        const newPatterns = threatLearner.learnPatternsFromActivities(activities);
        setLearnedPatterns(newPatterns);
        
        // Analyze activities with threat learner
        const threatAnalysis = threatLearner.analyzeActivities(activities);
        console.log('Threat analysis complete:', threatAnalysis.summary);
        
        // Progress update
        setProcessingPhase('generating-recommendations');
        
        // Configure the recommendation engine with optimal settings based on device
        await adaptiveConfig.initialize();
        const sensitivityLevel = adaptiveConfig.shouldEnableFeature('highPrecisionML') ? 'high' : 'medium';
        const useAdvancedAnalysis = adaptiveConfig.shouldEnableFeature('advancedMLAnalysis');
        
        console.log(`ML Configuration: sensitivity=${sensitivityLevel}, advanced=${useAdvancedAnalysis}`);
        
        // Use our ML recommendation engine with optimized settings
        const engine = new RecommendationEngine({
          sensitivityLevel,
          confidenceThreshold: 0.65,
          maxRecommendations: 20,
          useAdvancedAnalysis
        });
        
        setProcessingPhase('processing-recommendations');
        const mlRecommendations = engine.generateRecommendations(activities);
        
        // Store recommendations in cache
        if (mlRecommendations && mlRecommendations.length > 0) {
          try {
            localStorage.setItem(cachedRecommendationsKey, JSON.stringify(mlRecommendations));
            console.log('Cached ML recommendations for future use');
          } catch (storageError) {
            console.warn('Failed to cache recommendations:', storageError);
          }
        }
        
        setRecommendations(mlRecommendations);
        setError(null);
        setProcessingComplete(true);
      } catch (err) {
        console.error('Error in ML processing:', err);
        setError('Failed to generate ML insights: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
        setProcessingPhase('complete');
      }
    };
    
    // Only process when activities are loaded and not already processing
    if (!isProcessing && !isLoadingData && activities && activities.length > 0) {
      processMLInsights();
    }
  }, [activities, isProcessing, dataLoadError, dataError, isLoadingData]);
  
  // Helper to create a simple hash of activities for caching
  const hashActivities = (activities: UserActivity[]): string => {
    try {
      // Create a signature using activity count, newest timestamp, and data size
      const count = activities.length;
      const newest = activities.reduce((latest, act) => {
        if (!act.timestamp) return latest;
        const time = new Date(act.timestamp).getTime();
        return time > latest ? time : latest;
      }, 0);
      return `${count}_${newest}_${JSON.stringify(activities).length}`;
    } catch (e) {
      return String(activities.length);
    }
  };

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
  
  // Get loading progress percentage
  const getLoadingProgress = (): number => {
    switch (processingPhase) {
      case 'initializing': return 10;
      case 'loading-data': return 20;
      case 'analyzing-data': return 30;
      case 'using-cached-results': return 90;
      case 'analyzing-patterns': return 40;
      case 'generating-recommendations': return 60;
      case 'processing-recommendations': return 80;
      case 'complete': return 100;
      default: return 30;
    }
  };
  
  // Render loading status message
  const getLoadingMessage = (): string => {
    switch (processingPhase) {
      case 'initializing': return 'Initializing ML engine...';
      case 'loading-data': return 'Loading activity data...';
      case 'analyzing-data': return 'Analyzing activity data...';
      case 'using-cached-results': return 'Loading cached insights...';
      case 'analyzing-patterns': return 'Analyzing activity patterns...';
      case 'generating-recommendations': return 'Generating security insights...';
      case 'processing-recommendations': return 'Finalizing recommendations...';
      case 'complete': return 'Processing complete!';
      default: return 'Processing...';
    }
  };

  return (
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <div className="flex items-center mb-8">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>ML-Powered Security Insights</h1>
        </div>

<<<<<<< HEAD
      {(isProcessing || loading || isLoadingData) ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="w-64 mb-4">
            <LinearProgress 
              variant="determinate" 
              value={getLoadingProgress()} 
              color="primary" 
              className="h-2 rounded-full"
            />
          </div>
          <div className="mt-2 text-gray-600">
            {getLoadingMessage()}
          </div>
          {processingPhase === 'analyzing-patterns' && learnedPatterns > 0 && (
            <div className="mt-4 text-sm text-green-600 flex items-center">
              <FaLightbulb className="mr-2" /> Discovered {learnedPatterns} new threat patterns!
            </div>
          )}
        </div>
      ) : error || dataError ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error || dataError}</p>
          <p className="mt-2">Please upload activity data to get ML insights.</p>
          <div className="mt-4">
            <Link href="/upload" passHref>
              <Button variant="contained" color="primary">
                Upload Data
              </Button>
            </Link>
          </div>
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
=======
        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] w-full">
            <CircularProgress sx={{ color: '#8B5CF6' }} />
>>>>>>> 0481816de9b1c248174805c3fca29620f4a87b5c
          </div>
        ) : error ? (
          <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
            <h2 className="text-lg font-extrabold text-red-400 uppercase mb-2">Error</h2>
            <p className="text-red-300">{error}</p>
            <p className="text-gray-400 mt-2">Please upload activity data to get ML insights.</p>
          </div>
        ) : (
          <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="bg-gradient-to-br from-[#6E5FFE] to-[#8B5CF6] text-white p-8 rounded-lg shadow-2xl flex flex-col justify-center items-start min-h-[120px]">
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">{recommendations.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">Total Insights</div>
              </div>
              <div className="bg-gradient-to-br from-[#FF3B3B] to-[#EC4899] text-white p-8 rounded-lg shadow-2xl flex flex-col justify-center items-start min-h-[120px]">
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">
                  {recommendations.filter(r => r.severity === 'critical' || r.severity === 'high').length}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">High Priority</div>
              </div>
              <div className="bg-gradient-to-br from-[#FBBF24] to-[#F472B6] text-white p-8 rounded-lg shadow-2xl flex flex-col justify-center items-start min-h-[120px]">
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">
                  {recommendations.filter(r => r.severity === 'medium').length}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">Medium Priority</div>
              </div>
              <div className="bg-gradient-to-br from-[#34D399] to-[#10B981] text-white p-8 rounded-lg shadow-2xl flex flex-col justify-center items-start min-h-[120px]">
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">
                  {Object.keys(groupedRecommendations).length}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">Categories</div>
              </div>
            </div>

<<<<<<< HEAD
          {/* Learned Patterns Info */}
          {learnedPatterns > 0 && (
            <div className="bg-indigo-100 border border-indigo-200 text-indigo-800 p-4 rounded-md mb-6 flex items-center">
              <FaLightbulb className="text-indigo-500 mr-3 text-xl" />
              <div>
                <h3 className="font-medium">Self-Learning System</h3>
                <p className="text-sm">Our AI discovered {learnedPatterns} new threat patterns based on your data that will improve future detection.</p>
              </div>
            </div>
          )}

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
=======
            {/* ML Recommendations by Category */}
            {recommendations.length > 0 ? (
              <div className="space-y-8">
                {Object.entries(groupedRecommendations).map(([category, categoryRecommendations]) => (
                  <div key={category} className="mb-8">
                    <h2 className="text-xl font-extrabold text-[#EEE] uppercase tracking-wide mb-4 pl-4 border-l-4 border-[#6E5FFE]">{getCategoryName(category)}</h2>
                    <div className="space-y-4">
                      {categoryRecommendations.map((rec) => (
                        <div key={rec.id} className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-0 flex flex-col md:flex-row items-stretch min-h-[1px] h-full">
                          {/* Left: Alert Info */}
                          <div className="flex flex-col flex-1 md:w-1/2 p-8 h-auto">
                            <div className="mb-6">
                              <h3 className="font-extrabold text-[#EEE] text-2xl mb-4 tracking-wide leading-snug">{rec.title}</h3>
                              <p className="text-[#A0AEC0] text-base leading-relaxed font-medium">
                                User <span className="font-semibold text-[#F472B6] text-base">{rec.affectedUsers[0]}</span> has accessed or transferred sensitive data 1 times
                              </p>
>>>>>>> 0481816de9b1c248174805c3fca29620f4a87b5c
                            </div>
                            {/* Affected Users card */}
                            <div className="bg-[#232346] rounded-lg p-5 mb-6 border border-[#333]">
                              <span className="text-[#8B5CF6] font-bold text-base uppercase tracking-wider block mb-3">Affected Users:</span>
                              <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-1 max-w-full premium-scrollbar">
                                {rec.affectedUsers.map((user, i) => (
                                  <span
                                    key={i}
                                    className="bg-[#1F2030] text-[#F472B6] font-semibold px-4 py-1.5 rounded-full text-sm break-all border border-[#333] shadow-sm"
                                  >
                                    {user}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-3 items-center mt-auto">
                              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[#232346] text-purple-300 border border-[#333] shadow-sm">{formatConfidence(rec.confidence)}</span>
                              <span className={`px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-[#FF3B3B] to-[#EC4899] text-white shadow-sm`}>{rec.severity.toUpperCase()}</span>
                            </div>
                          </div>
                          {/* Right: Recommendations - edge-to-edge, no padding, no border-radius */}
                          <div className="flex flex-col flex-1 md:w-1/2 bg-gradient-to-br from-[#232346] to-[#1F2030] border-l-4 border-[#8B5CF6] rounded-r-xl shadow-xl p-8 h-auto">
                            <div className="flex items-center mb-4">
                              <svg className="w-5 h-5 text-[#8B5CF6] mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"/></svg>
                              <h4 className="text-base font-extrabold uppercase text-[#8B5CF6] tracking-wide">Recommended Actions:</h4>
                            </div>
                            <ul className="space-y-3 pl-2">
                              {rec.suggestedActions.map((action, i) => (
                                <li key={i} className="flex items-start text-gray-200 text-[1.08rem] leading-relaxed">
                                  <span className="w-2 h-2 mt-2 mr-3 rounded-full bg-[#8B5CF6] flex-shrink-0"></span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
<<<<<<< HEAD
              <h2 className="text-xl font-semibold mb-2">No ML Insights Available</h2>
              <p className="text-gray-600">
                Upload activity data from the data upload page to generate ML-powered security insights.
              </p>
              <div className="mt-4">
                <Link href="/upload" passHref>
                  <Button variant="contained" color="primary">
                    Upload Data
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Performance Metrics (if available) */}
          {processingComplete && performanceMetrics && performanceMetrics.processingTime && (
            <div className="bg-white rounded-lg shadow-sm p-4 text-xs text-gray-500 mt-8">
              <p>Processing completed in {performanceMetrics.processingTime.toFixed(2)}s • {normalizedCount} activities analyzed</p>
            </div>
          )}
        </div>
      )}
=======
            ) : (
              <div className="text-center py-8 text-gray-400 text-lg">No ML insights found for the current data.</div>
            )}
          </div>
        )}
      </div>
>>>>>>> 0481816de9b1c248174805c3fca29620f4a87b5c
    </div>
  );
}
  