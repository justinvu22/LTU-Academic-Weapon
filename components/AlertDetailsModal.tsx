"use client";

import React, { useState } from 'react';
import { MLAlertItem } from '../types/activity';
import { 
  Close,
  Psychology,
  Warning,
  ChevronRight,
  Schedule,
  CheckCircle
} from '@mui/icons-material';

interface AlertDetailsModalProps {
  alert: MLAlertItem;
  isOpen: boolean;
  onClose: () => void;
  onActionSubmit: (alertId: string, action: string, comments: string) => void;
}

interface OverviewTabProps {
  alert: MLAlertItem;
}

interface TimelineTabProps {
  alert: MLAlertItem;
}

interface ActionTabProps {
  alert: MLAlertItem;
  onClose: () => void;
  onActionSubmit: (alertId: string, action: string, comments: string) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-green-500/20 text-green-400 border-green-500/30';
  }
};

const formatTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

const PolicyBadge: React.FC<{ policy: string }> = ({ policy }) => (
  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs border border-red-500/30">
    {policy}
  </span>
);

const OverviewTab: React.FC<OverviewTabProps> = ({ alert }) => (
  <div className="space-y-6">
    {/* ML Detection Summary */}
    <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Psychology className="w-5 h-5 text-[#8B5CF6]" />
        ML Detection Analysis
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-[#8B5CF6] font-semibold mb-2">{alert.threatType}</h4>
          <p className="text-gray-300 leading-relaxed">{alert.description}</p>
          
          <div className="mt-4 flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#8B5CF6]">
                {Math.round(alert.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-400">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {alert.riskScore}
              </div>
              <div className="text-xs text-gray-400">Risk Score</div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-[#8B5CF6] font-semibold mb-3">Policies Breached</h4>
          <div className="space-y-2">
            {alert.policiesBreached.length > 0 ? (
              alert.policiesBreached.map((policy, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-[#1F2030] p-3 rounded-lg border border-[#333]">
                  <Warning className="w-4 h-4 text-red-400" />
                  <span className="text-white">{policy}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">No policy breaches detected</div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Detection Factors */}
    <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
      <h3 className="text-lg font-bold text-white mb-4">Detection Factors</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {alert.detectionFactors.map((factor, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-[#8B5CF6] mt-0.5" />
            <span className="text-gray-300 text-sm">{factor}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Suggested Actions */}
    <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
      <h3 className="text-lg font-bold text-white mb-4">ML Recommended Actions</h3>
      <ul className="space-y-3">
        {alert.suggestedActions.map((action, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="w-2 h-2 mt-2 rounded-full bg-[#8B5CF6] flex-shrink-0"></span>
            <span className="text-gray-300">{action}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const TimelineTab: React.FC<TimelineTabProps> = ({ alert }) => (
  <div className="relative">
    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#444]"></div>
    
    {alert.timeline.map((event) => (
      <div key={event.id} className="relative flex items-start mb-8">
        <div className={`
          absolute left-6 w-4 h-4 rounded-full border-2 
          ${event.isCritical ? 'bg-red-500 border-red-500' : 'bg-[#232346] border-[#8B5CF6]'}
        `}></div>
        
        <div className="ml-16 flex-1">
          <div className="bg-[#232346] rounded-lg p-4 border border-[#444]">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-white">{event.title}</h4>
              <span className="text-xs text-gray-400">{formatTime(event.timestamp)}</span>
            </div>
            <p className="text-gray-300 text-sm">{event.description}</p>
            {event.riskScore && (
              <div className="mt-2">
                <span className="text-xs text-gray-400">Risk Score: </span>
                <span className="text-xs font-bold text-orange-400">{event.riskScore}</span>
              </div>
            )}
            {event.policyBreach && (
              <div className="mt-2">
                <PolicyBadge policy={event.policyBreach} />
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ActionTab: React.FC<ActionTabProps> = ({ alert, onClose, onActionSubmit }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAction || !comments.trim()) {
      window.alert('Please select an action and provide comments.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onActionSubmit(alert.id, selectedAction, comments);
      onClose();
    } catch (error) {
      console.error('Error submitting action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
        <h3 className="text-lg font-bold text-white mb-4">Current Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getSeverityColor(alert.severity).split(' ')[1]}`}>
              {alert.severity.toUpperCase()}
            </div>
            <div className="text-xs text-gray-400">Severity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#8B5CF6] capitalize">
              {alert.status}
            </div>
            <div className="text-xs text-gray-400">Status</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-300">
              {alert.assignedTo || 'Unassigned'}
            </div>
            <div className="text-xs text-gray-400">Assigned To</div>
          </div>
        </div>
      </div>

      {/* Action Form */}
      <div className="bg-[#232346] rounded-lg p-6 border border-[#444]">
        <h3 className="text-lg font-bold text-white mb-4">Take Action</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Action:</label>
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
              <option value="dismissed">Dismiss Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Comments:</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide details about the action taken and any relevant context..."
              className="w-full p-3 bg-[#1F2030] border border-[#444] rounded-lg text-white focus:border-[#8B5CF6] focus:outline-none h-32 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedAction || !comments.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#6E5FFE] to-[#8B5CF6] text-white font-bold rounded-lg hover:from-[#5B4FEE] hover:to-[#7C4FE4] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save Action
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AlertDetailsModal: React.FC<AlertDetailsModalProps> = ({
  alert,
  isOpen,
  onClose,
  onActionSubmit
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Psychology },
    { id: 'timeline', label: 'Timeline', icon: Schedule },
    { id: 'action', label: 'Action', icon: CheckCircle }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F2030] rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden border border-[#333] shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#232346] to-[#1F2030] p-6 border-b border-[#444]">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Security Alert: {alert.userEmail}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-[#8B5CF6]">Alert ID: {alert.id}</span>
                <span className={`px-3 py-1 rounded-full text-sm border ${getSeverityColor(alert.severity)}`}>
                  {alert.severity.toUpperCase()} PRIORITY
                </span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#333] transition-colors"
            >
              <Close className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#444] bg-[#1F2030]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-semibold capitalize transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6] bg-[#232346]'
                    : 'text-gray-400 hover:text-white hover:bg-[#232346]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && <OverviewTab alert={alert} />}
          {activeTab === 'timeline' && <TimelineTab alert={alert} />}
          {activeTab === 'action' && <ActionTab alert={alert} onClose={onClose} onActionSubmit={onActionSubmit} />}
        </div>
      </div>
    </div>
  );
}; 