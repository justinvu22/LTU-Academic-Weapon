// app/ml/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RecommendationEngine } from '../../ml/recommendationEngine';
import { UserActivity, MLRecommendation } from '../../types/activity';
import { UserReviewModal } from '../../components/UserReviewModal';
import { AlertsManager } from '../../utils/alertsManager';

export default function MLPage() {
  // State for loading stored activities
  const [activities, setActivities] = useState<UserActivity[]>([]);

  const [loading, setLoading] = useState(false);
  const [mlProcessing, setMlProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // User Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedUserReview, setSelectedUserReview] = useState<{
    userId: string;
    mlInsightTitle: string;
    mlInsightDescription: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    suggestedActions: string[];
  } | null>(null);
  
  // Create a stable recommendation engine instance using useRef
  const recommendationEngineRef = useRef<RecommendationEngine | null>(null);
  if (!recommendationEngineRef.current) {
    recommendationEngineRef.current = new RecommendationEngine({
      sensitivityLevel: 'medium',
      maxRecommendations: 100,
      confidenceThreshold: 0.40,
      useAnomalyDetection: true,
      criticalHours: [1, 2, 3, 22, 23],
      temporalBurstMultiplier: 1.5,
      learnFromManagerActions: true,
      includeAllRecommendations: true,
      useAdvancedAnalysis: true
    });
  }
  const recommendationEngine = recommendationEngineRef.current;
  
  // Load activities data from storage on component mount
  useEffect(() => {
    const loadActivitiesData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Loading activities from storage...");
        
        // Load activities from storage
        const { getActivitiesFromIndexedDB } = await import('../../utils/storage');
        
        try {
          const activitiesData = await getActivitiesFromIndexedDB();
          console.log(`Loaded ${activitiesData.length} activities from storage for ML analysis`);
          
          if (activitiesData.length === 0) {
            setError('No activity data available. Please upload data from the Upload page first.');
            setLoading(false);
            return;
          }
          
          // Set activities directly without the hook
          setActivities(activitiesData);
          
          // Create simple ML results
          setRecommendations([]);
          
          // Set loading to false after successfully loading data
          setLoading(false);
          
        } catch (storageError) {
          console.error('Error accessing IndexedDB:', storageError);
          setError('Error accessing data storage. Please try uploading data again.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading activities data:', err);
        setError('Error loading activity data. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    loadActivitiesData();
    
    // Listen for data upload events
    const handleDataUpload = (event: CustomEvent) => {
      console.log('ML Page: Detected new data upload, refreshing...', event.detail);
      loadActivitiesData();
    };
    
    window.addEventListener('dataUploaded', handleDataUpload as EventListener);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('dataUploaded', handleDataUpload as EventListener);
    };
  }, []); // Only run once on mount and when data upload events occur
  
  // Generate ML insights using the recommendation engine
  useEffect(() => {
    if (activities.length === 0) return;
    
    console.log('Calculating ML results for', activities.length, 'activities');
    
    setMlProcessing(true);
    
    // Process ML analysis
    const processedResults = recommendationEngine.generateRecommendations(activities);
    setRecommendations(processedResults);
    
    // Create alerts from recommendations
    if (processedResults.length > 0) {
      // Clear old alerts and create new ones
      AlertsManager.refreshAlertsFromRecommendations(processedResults);
      console.log(`Created ${processedResults.length} new alerts`);
    }
    
    console.log('ML processing complete');
    
    setLoading(false);
    setMlProcessing(false);
  }, [activities, recommendationEngine]);
  
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
    if (loading && !mlProcessing) {
      return 50; // Data loading phase
    } else if (mlProcessing) {
      return 85; // ML processing phase
    }
    return 100; // Complete
  };
  
  // Render loading status message
  const getLoadingMessage = (): string => {
    if (loading && !mlProcessing) {
      return 'Loading data...';
    } else if (mlProcessing) {
      return 'Processing ML insights...';
    }
    return 'Analysis complete!';
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

  // User Review Modal handlers
  const handleReviewUser = (userId: string, recommendation: MLRecommendation) => {
    setSelectedUserReview({
      userId,
      mlInsightTitle: recommendation.title,
      mlInsightDescription: recommendation.description,
      severity: recommendation.severity,
      confidence: recommendation.confidence,
      suggestedActions: recommendation.suggestedActions
    });
    setReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedUserReview(null);
  };

  return (
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>ML-POWERED SECURITY INSIGHTS</h1>
        </div>

        {(loading || mlProcessing) ? (
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
                                  <button
                                    key={i}
                                    onClick={() => handleReviewUser(user, rec)}
                                    className="bg-[#1F2030] text-[#F472B6] font-semibold px-4 py-1.5 rounded-full text-sm break-all border border-[#333] shadow-sm hover:bg-[#2A2A46] hover:border-[#8B5CF6] transition-all duration-200 cursor-pointer group flex items-center gap-2"
                                    title={`Click to review ${user}`}
                                  >
                                    <span>{user}</span>
                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                ))}
                              </div>
                              
                              {/* Review All Button */}
                              {rec.affectedUsers.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-[#333]">
                                  <button
                                    onClick={() => {
                                      // For now, review the first user as a representative
                                      if (rec.affectedUsers.length > 0) {
                                        handleReviewUser(rec.affectedUsers[0], rec);
                                      }
                                    }}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-[#6E5FFE] to-[#8B5CF6] text-white font-bold rounded-lg hover:from-[#5B4FEE] hover:to-[#7C4FE4] transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Review Users ({rec.affectedUsers.length})
                                  </button>
                                </div>
                              )}
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
      
      {/* User Review Modal */}
      {selectedUserReview && (
        <UserReviewModal
          isOpen={reviewModalOpen}
          onClose={handleCloseReviewModal}
          userId={selectedUserReview.userId}
          mlInsightTitle={selectedUserReview.mlInsightTitle}
          mlInsightDescription={selectedUserReview.mlInsightDescription}
          severity={selectedUserReview.severity}
          confidence={selectedUserReview.confidence}
          suggestedActions={selectedUserReview.suggestedActions}
          activities={activities}
        />
      )}
    </div>
  );
}
  