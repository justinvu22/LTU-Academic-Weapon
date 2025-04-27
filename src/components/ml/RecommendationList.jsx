import React from 'react';

const RecommendationList = ({ recommendations, recommendationsByCategory, recommendationsBySeverity }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'monitoring':
        return '👀';
      case 'access_control':
        return '🔒';
      case 'training':
        return '📚';
      case 'incident_response':
        return '🚨';
      case 'data_protection':
        return '🛡️';
      case 'cloud_security':
        return '☁️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">ML-Powered Recommendations</h2>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800">High Severity</h3>
          <p className="text-2xl font-semibold text-red-600">
            {recommendations.filter(r => r.severity === 'high').length}
          </p>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Medium Severity</h3>
          <p className="text-2xl font-semibold text-yellow-600">
            {recommendations.filter(r => r.severity === 'medium').length}
          </p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-sm font-medium text-green-800">Low Severity</h3>
          <p className="text-2xl font-semibold text-green-600">
            {recommendations.filter(r => r.severity === 'low').length}
          </p>
        </div>
      </div>
      
      {/* Recommendations by Category */}
      {recommendationsByCategory && Array.from(recommendationsByCategory.entries()).map(([category, recs]) => (
        <div key={category} className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <span className="mr-2">{getCategoryIcon(category)}</span>
            {category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </h3>
          <div className="space-y-4">
            {recs.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getSeverityColor(rec.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{rec.recommendation}</h4>
                    <p className="mt-2 text-sm">{rec.explanation}</p>
                    {rec.examples.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium">Examples ({rec.count} occurrences):</p>
                        <ul className="text-sm mt-1">
                          {rec.examples.map((ex, i) => (
                            <li key={i} className="ml-4 list-disc">
                              User: {ex.user}, Risk: {ex.riskScore.toFixed(1)}
                              {ex.factors.length > 0 && (
                                <span> - {ex.factors[0]}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(rec.severity)}`}>
                      {rec.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500 mt-2">
                      Priority: {rec.priorityScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationList; 