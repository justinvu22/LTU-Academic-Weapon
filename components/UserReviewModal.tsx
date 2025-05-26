"use client";

import React, { useState, useEffect } from 'react';
import { UserActivity } from '../types/activity';

interface UserReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  mlInsightTitle: string;
  mlInsightDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  suggestedActions: string[];
  activities: UserActivity[];
}

interface ManagerAction {
  action: string;
  comments: string;
  timestamp: string;
}

export const UserReviewModal: React.FC<UserReviewModalProps> = ({
  isOpen,
  onClose,
  userId,
  mlInsightTitle,
  mlInsightDescription,
  severity,
  confidence,
  suggestedActions,
  activities
}) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localActivities, setLocalActivities] = useState<UserActivity[]>(activities);
  
  // Update local activities when activities prop changes or when new data is uploaded
  useEffect(() => {
    setLocalActivities(activities);
    console.log(`[UserReviewModal] Activities updated for user ${userId}, received ${activities.length} activities`);
  }, [activities, userId]);

  // Listen for data upload events to refresh activities
  useEffect(() => {
    const handleDataUpload = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[UserReviewModal] Detected new data upload, refreshing modal data...', customEvent.detail);
      
      // Load fresh activities data from storage
      try {
        const { getActivitiesFromIndexedDB } = await import('../utils/storage');
        const freshActivities = await getActivitiesFromIndexedDB();
        setLocalActivities(freshActivities);
        console.log(`[UserReviewModal] Refreshed with ${freshActivities.length} fresh activities`);
      } catch (error) {
        console.error('[UserReviewModal] Error refreshing activities:', error);
      }
    };

    const handleStorageCleared = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[UserReviewModal] Detected storage cleared, clearing modal data...', customEvent.detail);
      
      // Clear local activities when storage is cleared
      setLocalActivities([]);
    };

    if (isOpen) {
      window.addEventListener('dataUploaded', handleDataUpload);
      window.addEventListener('storageCleared', handleStorageCleared);
    }

    return () => {
      window.removeEventListener('dataUploaded', handleDataUpload);
      window.removeEventListener('storageCleared', handleStorageCleared);
    };
  }, [isOpen]);
  
  // Filter activities for this specific user using local activities
  const userActivities = localActivities
    .filter(activity => 
      activity.user === userId || 
      activity.username === userId || 
      activity.userId === userId
    )
    .sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime())
    .slice(0, 10);

  // Calculate user risk metrics using filtered activities
  const calculateUserMetrics = () => {
    const totalActivities = userActivities.length;
    const averageRiskScore = userActivities.reduce((sum, activity) => 
      sum + (activity.riskScore || 0), 0) / Math.max(totalActivities, 1);
    
    const policyBreaches = userActivities.filter(activity => 
      activity.policiesBreached && Object.keys(activity.policiesBreached).length > 0
    ).length;
    
    const highRiskActivities = userActivities.filter(activity => 
      (activity.riskScore || 0) >= 1000
    ).length;

    return {
      totalActivities,
      averageRiskScore: Math.round(averageRiskScore),
      policyBreaches,
      highRiskActivities
    };
  };

  const metrics = calculateUserMetrics();

  const handleSubmitAction = async () => {
    if (!selectedAction || !managerComments.trim()) {
      alert('Please select an action and provide comments.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call to save manager action
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically save to your backend/database
      const action: ManagerAction = {
        action: selectedAction,
        comments: managerComments,
        timestamp: new Date().toISOString()
      };
      
      console.log('Manager action submitted:', { userId, action });
      
      // Reset form and close modal
      setSelectedAction('');
      setManagerComments('');
      onClose();
      
    } catch (error) {
      console.error('Error submitting manager action:', error);
      alert('Error submitting action. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-green-400 bg-green-500/20 border-green-500/30';
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F2030] rounded-xl border border-[#333] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333]">
          <div>
            <h2 className="text-2xl font-bold text-[#EEE] flex items-center gap-3">
              <span className="text-[#8B5CF6]">👤</span>
              Security Review: {userId}
            </h2>
            <p className="text-gray-400 mt-1">ML-Detected Security Anomaly</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#333] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ML Detection Summary */}
          <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
            <h3 className="text-lg font-bold text-[#EEE] mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              ML Detection Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-semibold text-[#8B5CF6] mb-2">{mlInsightTitle}</h4>
                <p className="text-gray-300 text-sm">{mlInsightDescription}</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Severity:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityColor(severity)}`}>
                    {severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Confidence:</span>
                  <span className="text-[#8B5CF6] font-semibold">{Math.round(confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#232346] p-4 rounded-lg border border-[#444] text-center">
              <div className="text-2xl font-bold text-[#8B5CF6]">{metrics.totalActivities}</div>
              <div className="text-sm text-gray-400">Total Activities</div>
            </div>
            <div className="bg-[#232346] p-4 rounded-lg border border-[#444] text-center">
              <div className="text-2xl font-bold text-orange-400">{metrics.averageRiskScore}</div>
              <div className="text-sm text-gray-400">Avg Risk Score</div>
            </div>
            <div className="bg-[#232346] p-4 rounded-lg border border-[#444] text-center">
              <div className="text-2xl font-bold text-red-400">{metrics.policyBreaches}</div>
              <div className="text-sm text-gray-400">Policy Breaches</div>
            </div>
            <div className="bg-[#232346] p-4 rounded-lg border border-[#444] text-center">
              <div className="text-2xl font-bold text-yellow-400">{metrics.highRiskActivities}</div>
              <div className="text-sm text-gray-400">High Risk</div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
            <h3 className="text-lg font-bold text-[#EEE] mb-4">Recent Activities</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {userActivities.map((activity, index) => (
                <div key={index} className="bg-[#1F2030] p-4 rounded-lg border border-[#333] flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-sm text-gray-300">
                      <span className="font-semibold">ID:</span> {activity.id || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatTimestamp(activity.timestamp)} • {activity.integration || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      (activity.riskScore || 0) >= 1000 ? 'text-red-400' : 
                      (activity.riskScore || 0) >= 500 ? 'text-orange-400' : 'text-green-400'
                    }`}>
                      Risk: {activity.riskScore || 0}
                    </div>
                    {activity.status && (
                      <div className="text-xs text-gray-500 capitalize">{activity.status}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Actions */}
          <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
            <h3 className="text-lg font-bold text-[#EEE] mb-4">ML Recommended Actions</h3>
            <ul className="space-y-2">
              {suggestedActions.map((action, index) => (
                <li key={index} className="flex items-start text-gray-300">
                  <span className="w-2 h-2 mt-2 mr-3 rounded-full bg-[#8B5CF6] flex-shrink-0"></span>
                  <span className="text-sm">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Manager Action Section */}
          <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
            <h3 className="text-lg font-bold text-[#EEE] mb-4">Manager Action Required</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Action Taken:</label>
                <select 
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full p-3 bg-[#1F2030] border border-[#444] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="">Select an action...</option>
                  <option value="employee_counselled">Employee Counselled</option>
                  <option value="access_restricted">Access Restricted</option>
                  <option value="additional_training">Additional Training Required</option>
                  <option value="policy_violation">Policy Violation Documented</option>
                  <option value="no_action">No Action Required</option>
                  <option value="escalated">Escalated to IT Security</option>
                  <option value="monitoring">Enhanced Monitoring Enabled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Comments:</label>
                <textarea 
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  placeholder="Provide details about the action taken and any relevant context..."
                  className="w-full p-3 bg-[#1F2030] border border-[#444] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none h-32 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmitAction}
                  disabled={isSubmitting || !selectedAction || !managerComments.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-[#6E5FFE] to-[#8B5CF6] text-white font-bold rounded-lg hover:from-[#5B4FEE] hover:to-[#7C4FE4] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Action
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
                >
                  Close Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 