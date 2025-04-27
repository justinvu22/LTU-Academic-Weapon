import React from 'react';

const RiskInsights = ({ insights }) => {
  const getRiskColor = (type) => {
    switch (type) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Risk Analysis & Recommendations</h3>
      <div className="grid gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg shadow ${getRiskColor(insight.type)}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{insight.description}</p>
                <p className="mt-2 text-sm">{insight.recommendation}</p>
              </div>
              <span className="text-xs opacity-75">
                {new Date(insight.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskInsights; 