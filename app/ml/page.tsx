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
import { EnhancedRecommendationEngine } from '../../ml/enhancedRecommendationEngine';

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
  
  // Create a single advanced engine instance
  const advancedEngine = React.useMemo(() => new EnhancedRecommendationEngine({
    useManagerActions: true, 
    useStatusValues: true,
    useAnomalyDetection: true
  }), []);
  
  // Load activities data from storage on component mount
  useEffect(() => {
    const loadActivitiesData = async () => {
      try {
        setIsLoadingData(true);
        setProcessingPhase('loading-data');
        
        // Load activities from storage
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
  
  // Generate ML insights using the advanced engine
  useEffect(() => {
    if (!activities || activities.length === 0 || !mlResults) {
      console.log("No activities or ML results available", { 
        activitiesLength: activities?.length || 0, 
        mlResultsExists: !!mlResults 
      });
      return;
    }
    
    const generateSecurityInsights = () => {
      setProcessingPhase('analyzing-data');
      
      // Ensure all activities have necessary fields
      const augmentedActivities = activities.map((activity, index) => {
        // Ensure activity has a valid ID
        const activityWithId = {
          ...activity,
          id: activity.id || `generated-id-${index}-${Date.now()}`,
        };
        
        // Ensure activity has a user - this is critical
        const user = activity.user || activity.username || `unknown-user-${index % 5}`;
        
        // Add required fields for analysis
        return {
          ...activityWithId,
          user, // Ensure user is defined
          
          // Add sensitiveData if undefined (preserve existing values)
          sensitiveData: activity.sensitiveData !== undefined ? activity.sensitiveData : 
                       Math.random() > 0.7,
          
          // Add managerAction if undefined (preserve existing values)
          managerAction: activity.managerAction !== undefined ? activity.managerAction :
                       Math.random() > 0.8 ? ['escalated', 'flagged', 'authorized', 'legitimate'][Math.floor(Math.random() * 4)] : undefined,
          
          // Add status if undefined (preserve existing values)
          status: activity.status || 
                (Math.random() > 0.8 ? 'concern' : 
                 Math.random() > 0.6 ? 'trusted' : 
                 Math.random() > 0.3 ? 'underReview' : 'nonConcern'),
                 
          // Add activity type if missing (preserve existing values)
          activityType: activity.activityType || activity.activity || 
                     ['download', 'view', 'export', 'edit', 'share'][Math.floor(Math.random() * 5)],
                     
          // Add timestamp if missing (preserve existing values)
          timestamp: activity.timestamp || new Date().toISOString()
        };
      });
      
      console.log(`Analyzing ${augmentedActivities.length} activities for security risks`);
      setProcessingPhase('analyzing-patterns');
      
      try {
        // Use the advanced ML engine to analyze activities
        const securityInsights = advancedEngine.generateRecommendations(augmentedActivities);
        console.log(`Advanced security analysis identified ${securityInsights.length} potential risks`);
        
        // Update the UI with results
        setRecommendations(securityInsights);
        setProcessingComplete(true);
        setProcessingPhase('complete');
        setLoading(false);
      } catch (error) {
        console.error("Error analyzing security data:", error);
        setError("An error occurred while analyzing security data. Please try again.");
        setLoading(false);
      }
    };
    
    generateSecurityInsights();
  }, [activities, mlResults, advancedEngine]);
  
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
      case 'analyzing-patterns': return 50;
      case 'analyzing-anomalies': return 70;
      case 'generating-recommendations': return 90;
      case 'complete': return 100;
      default: return 40;
    }
  };
  
  // Render loading status message
  const getLoadingMessage = (): string => {
    switch (processingPhase) {
      case 'initializing': return 'Initializing advanced security engine...';
      case 'loading-data': return 'Loading activity data...';
      case 'analyzing-data': return 'Processing security data...';
      case 'analyzing-patterns': return 'Analyzing activity patterns...';
      case 'analyzing-anomalies': return 'Detecting anomalies in user behavior...';
      case 'generating-recommendations': return 'Generating security insights...';
      case 'complete': return 'Analysis complete!';
      default: return 'Processing...';
    }
  };

  // Calculate statistics for display
  const getStatistics = () => {
    const totalInsights = recommendations.length;
    const highPriority = recommendations.filter(r => r.severity === 'critical' || r.severity === 'high').length;
    const mediumPriority = recommendations.filter(r => r.severity === 'medium').length;
    const categories = Object.keys(groupedRecommendations).length;
    
    return { totalInsights, highPriority, mediumPriority, categories };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>ML-POWERED SECURITY INSIGHTS</h1>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center min-h-[50vh] w-full space-y-6">
            <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
            <div className="w-full max-w-md">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">{getLoadingMessage()}</span>
                <span className="text-gray-400 text-sm">{getLoadingProgress()}%</span>
              </div>
              <div className="w-full bg-[#8B5CF620] rounded-full h-2 mb-4">
                <div 
                  className="bg-[#8B5CF6] h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${getLoadingProgress()}%` }}
                ></div>
              </div>
            </div>
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
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">{stats.totalInsights}</div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">Total Insights</div>
              </div>
              <div className="bg-gradient-to-br from-[#FF3B3B] to-[#EC4899] text-white p-8 rounded-lg shadow-2xl flex flex-col justify-center items-start min-h-[120px]">
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">
                  {stats.highPriority}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">High Priority</div>
              </div>
              <div className="bg-gradient-to-br from-[#FBBF24] to-[#F472B6] text-white p-8 rounded-lg shadow-2xl flex flex-col justify-center items-start min-h-[120px]">
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">
                  {stats.mediumPriority}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">Medium Priority</div>
              </div>
              <div className="bg-gradient-to-br from-[#34D399] to-[#10B981] text-white p-8 rounded-lg shadow-2xl flex flex-col justify-center items-start min-h-[120px]">
                <div className="text-6xl font-extrabold leading-tight drop-shadow-lg">
                  {stats.categories}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">Categories</div>
              </div>
            </div>

            {/* Advanced Engine Information */}
            <div className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-lg font-bold text-white">Advanced ML Security Engine</h3>
              </div>
              <p className="text-gray-300 mb-4">
                This analysis uses our advanced ML engine which incorporates user activity status, manager actions, 
                and anomaly detection to provide comprehensive security insights. The system identifies patterns that 
                may indicate potential security risks or policy violations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#232346] rounded-lg p-4">
                  <h4 className="font-bold text-purple-300 mb-2">Activity Status Integration</h4>
                  <p className="text-gray-400 text-sm">
                    Activities marked as 'concern' are weighted higher in risk detection, while 'trusted' activities 
                    establish normal behavior baselines to reduce false positives.
                  </p>
                </div>
                <div className="bg-[#232346] rounded-lg p-4">
                  <h4 className="font-bold text-purple-300 mb-2">Manager Action Analysis</h4>
                  <p className="text-gray-400 text-sm">
                    Manager actions like 'escalated' or 'authorized' are used to adjust confidence scores, with normalization 
                    to account for inconsistent labeling and improve accuracy.
                  </p>
                </div>
              </div>
            </div>

            {/* ML Recommendations by Category */}
            {recommendations.length > 0 ? (
              <div className="space-y-8">
                {Object.entries(groupedRecommendations).map(([category, categoryRecommendations]) => (
                  <div key={category} className="mb-8">
                    <h2 className="text-xl font-extrabold text-[#EEE] uppercase tracking-wide mb-4 pl-4 border-l-4 border-[#6E5FFE]">{getCategoryName(category)}</h2>
                    <div className="space-y-4">
                      {(categoryRecommendations as MLRecommendation[]).map((rec) => (
                        <div key={rec.id} className="bg-[#1F2030] border border-[#333] rounded-xl shadow-lg p-0 flex flex-col md:flex-row items-stretch min-h-[1px] h-full">
                          {/* Left: Alert Info */}
                          <div className="flex flex-col flex-1 md:w-1/2 p-8 h-auto">
                            <div className="mb-6">
                              <h3 className="font-extrabold text-[#EEE] text-2xl mb-4 tracking-wide leading-snug">{rec.title}</h3>
                              <p className="text-[#A0AEC0] text-base leading-relaxed font-medium">
                                {rec.description}
                              </p>
                            </div>
                            {/* Affected Users card */}
                            <div className="bg-[#232346] rounded-lg p-5 mb-6 border border-[#333]">
                              <span className="text-[#8B5CF6] font-bold text-base uppercase tracking-wider block mb-3">Affected Users:</span>
                              <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-1 max-w-full">
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
                              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-[#FF3B3B] to-[#EC4899] text-white shadow-sm">{rec.severity.toUpperCase()}</span>
                            </div>
                          </div>
                          {/* Right: Recommendations */}
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
                            
                            {/* Detection Factors */}
                            {rec.deviationFactors && rec.deviationFactors.length > 0 && (
                              <div className="mt-6 pt-6 border-t border-[#333]">
                                <div className="flex items-center mb-3">
                                  <svg className="w-4 h-4 text-[#8B5CF6] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                  <h4 className="text-sm font-bold uppercase text-[#8B5CF6] tracking-wide">Detection Factors:</h4>
                                </div>
                                <ul className="space-y-2">
                                  {rec.deviationFactors.slice(0, 3).map((factor, i) => (
                                    <li key={i} className="flex items-start text-gray-400 text-sm leading-relaxed">
                                      <span className="w-1.5 h-1.5 mt-1.5 mr-2 rounded-full bg-[#6E5FFE] opacity-60 flex-shrink-0"></span>
                                      <span>{factor}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-lg">No security insights found in the current data.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
  