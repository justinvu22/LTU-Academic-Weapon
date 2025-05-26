import React, { useState, useEffect } from 'react';
import { AlertsManager } from '../utils/alertsManager';
import { MLAlertItem } from '../types/activity';
import { AlertDetailsModal } from './AlertDetailsModal';

export const ImmediateReview: React.FC = () => {
  const [alerts, setAlerts] = useState<MLAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<MLAlertItem | null>(null);

  // Load alerts on mount and listen for updates
  useEffect(() => {
    loadAlerts();

    // Listen for alert updates
    const handleAlertsUpdate = () => {
      loadAlerts();
    };

    window.addEventListener('alertsCleared', handleAlertsUpdate);
    window.addEventListener('alertsUpdated', handleAlertsUpdate);

    return () => {
      window.removeEventListener('alertsCleared', handleAlertsUpdate);
      window.removeEventListener('alertsUpdated', handleAlertsUpdate);
    };
  }, []);

  const loadAlerts = () => {
    setLoading(true);
    try {
      const storedAlerts = AlertsManager.getAlerts();
      // Sort by detection time (newest first)
      const sortedAlerts = storedAlerts.sort((a, b) => 
        new Date(b.detectionTime).getTime() - new Date(a.detectionTime).getTime()
      );
      setAlerts(sortedAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const PolicyBadge = ({ policy }: { policy: string }) => (
    <span className="px-2 py-1 bg-[#6E5FFE]/20 text-[#8B5CF6] text-xs rounded-full border border-[#6E5FFE]/30">
      {policy}
    </span>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">ML-Detected Security Alerts</h2>
          <p className="text-gray-400 text-sm mt-1">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} requiring immediate review
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          <select className="bg-[#232346] text-white px-4 py-2 rounded-lg border border-[#444]">
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High & Above</option>
          </select>
          <select className="bg-[#232346] text-white px-4 py-2 rounded-lg border border-[#444]">
            <option value="pending">Pending</option>
            <option value="reviewing">Under Review</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-[#232346] border border-[#444] rounded-lg p-8 text-center">
          <p className="text-gray-400">No security alerts at this time.</p>
          <p className="text-gray-500 text-sm mt-2">
            ML insights will appear here when anomalies are detected.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className="bg-[#232346] border border-[#444] rounded-lg p-6 hover:border-[#6E5FFE] transition-all cursor-pointer"
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User and Threat Type */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-semibold text-lg">
                      {alert.userEmail}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Threat Type and Description */}
                  <div className="mb-3">
                    <h3 className="text-[#8B5CF6] font-semibold mb-1">
                      {alert.threatType}
                    </h3>
                    <p className="text-gray-300 text-sm line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                  
                  {/* Policies Breached */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {alert.policiesBreached.slice(0, 3).map((policy, idx) => (
                      <PolicyBadge key={idx} policy={policy} />
                    ))}
                    {alert.policiesBreached.length > 3 && (
                      <span className="text-gray-400 text-xs">
                        +{alert.policiesBreached.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Risk Score: {alert.riskScore}</span>
                    <span>•</span>
                    <span>Confidence: {Math.round(alert.confidence * 100)}%</span>
                    <span>•</span>
                    <span>{formatRelativeTime(alert.detectionTime)}</span>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      AlertsManager.markAsReviewing(alert.id);
                      loadAlerts();
                    }}
                    className="px-4 py-2 bg-[#6E5FFE] text-white rounded-lg hover:bg-[#5B4FEE] text-sm font-medium transition-colors"
                  >
                    Review Now
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      AlertsManager.assignToMe(alert.id);
                      loadAlerts();
                    }}
                    className="px-4 py-2 bg-[#232346] text-gray-300 rounded-lg hover:bg-[#333] text-sm border border-[#444] transition-colors"
                  >
                    Assign to Me
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <AlertDetailsModal 
          alert={selectedAlert}
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onActionSubmit={() => {
            loadAlerts();
            setSelectedAlert(null);
          }}
        />
      )}
    </div>
  );
};

// Helper function for relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
  return `${Math.floor(diffMins / 1440)} days ago`;
} 