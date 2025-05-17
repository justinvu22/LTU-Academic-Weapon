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
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <div className="flex items-center mb-8">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>ML-Powered Security Insights</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] w-full">
            <CircularProgress sx={{ color: '#8B5CF6' }} />
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
            ) : (
              <div className="text-center py-8 text-gray-400 text-lg">No ML insights found for the current data.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
  