import React from 'react';

const AnomalyTable = ({ anomalies }) => {
  const getRiskColor = (riskScore) => {
    if (riskScore >= 2000) return 'text-red-600';
    if (riskScore >= 1000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getActivityType = (activity) => {
    if (activity.integration) {
      return activity.integration.replace('si-', '').toUpperCase();
    }
    return 'UNKNOWN';
  };

  const getActivityDetails = (activity) => {
    const details = [];
    
    // Add policy breaches if any
    if (activity.policiesBreached) {
      try {
        const policies = JSON.parse(activity.policiesBreached);
        Object.entries(policies).forEach(([category, violations]) => {
          if (Array.isArray(violations)) {
            violations.forEach(violation => {
              details.push(violation);
            });
          }
        });
      } catch (e) {
        console.warn('Failed to parse policies:', e);
      }
    }

    // Add values if any
    if (activity.values) {
      try {
        const values = JSON.parse(activity.values);
        Object.entries(values).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => details.push(`${key}: ${v}`));
          } else {
            details.push(`${key}: ${value}`);
          }
        });
      } catch (e) {
        console.warn('Failed to parse values:', e);
      }
    }

    return details.length > 0 ? details.join(', ') : 'No details available';
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Detected Anomalies</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {anomalies.map((anomaly) => (
              <tr key={anomaly.activityId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getActivityType(anomaly)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {anomaly.user}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(`${anomaly.date} ${anomaly.time}`).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                  {getActivityDetails(anomaly)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getRiskColor(anomaly.riskScore)}`}>
                  {anomaly.riskScore}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {anomaly.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnomalyTable; 