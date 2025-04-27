import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const Alerts = ({ anomalies }) => {
  const { settings } = useSettings();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newAlerts = anomalies
      .filter(anomaly => anomaly.anomalyScore >= settings.alertThreshold)
      .map(anomaly => ({
        id: anomaly.activityId,
        type: 'anomaly',
        severity: anomaly.riskScore >= 2000 ? 'high' : anomaly.riskScore >= 1000 ? 'medium' : 'low',
        message: `Unusual activity detected: ${anomaly.integration} by ${anomaly.user}`,
        timestamp: new Date(`${anomaly.date} ${anomaly.time}`),
        details: anomaly
      }));

    setAlerts(newAlerts);
  }, [anomalies, settings.alertThreshold]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-green-100 border-green-200 text-green-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Anomaly Alerts</h3>
      <div className="space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{alert.message}</p>
                <p className="text-sm mt-1">
                  {alert.timestamp.toLocaleString()}
                </p>
              </div>
              <span className="text-xs font-semibold">
                {alert.severity.toUpperCase()}
              </span>
            </div>
            <div className="mt-2 text-sm">
              <button
                onClick={() => console.log('View details:', alert.details)}
                className="text-blue-600 hover:text-blue-800"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No alerts at the current threshold
          </p>
        )}
      </div>
    </div>
  );
};

export default Alerts; 