import React from 'react';

const StatCards = ({ totalActivities, anomalyCount, recommendationCount }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Total Activities</h3>
        <p className="text-2xl font-semibold">{totalActivities}</p>
      </div>
      
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Anomalies Detected</h3>
        <p className="text-2xl font-semibold text-red-600">{anomalyCount}</p>
      </div>
      
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Recommendations</h3>
        <p className="text-2xl font-semibold text-blue-600">{recommendationCount}</p>
      </div>
    </div>
  );
};

export default StatCards; 