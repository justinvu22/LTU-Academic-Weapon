'use client';

import { useState, useEffect } from 'react';
import { runMachineLearningAnalysis } from '@/lib/ml/analysisService';

export default function MLTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  async function handleRunAnalysis() {
    setLoading(true);
    setError(null);
    
    try {
      const analysisResults = await runMachineLearningAnalysis();
      setResults(analysisResults);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Error running analysis: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Machine Learning Component Test</h1>
      
      <div className="mb-6">
        <button
          onClick={handleRunAnalysis}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Running Analysis...' : 'Run ML Analysis'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-md border">
              <h3 className="font-semibold">Total Activities</h3>
              <p className="text-2xl">{results.stats.totalActivities}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md border">
              <h3 className="font-semibold">Anomalies Detected</h3>
              <p className="text-2xl">{results.stats.anomalyCount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md border">
              <h3 className="font-semibold">Recommendations</h3>
              <p className="text-2xl">{results.stats.recommendationCount}</p>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-bold mb-3">ML-Powered Recommendations</h2>
            {results.recommendations.map((rec, index) => (
              <div key={index} className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-semibold text-lg">{rec.recommendation}</h3>
                <p className="text-gray-700 mb-2">{rec.explanation}</p>
                <div className="mt-2">
                  <p className="text-sm font-medium">Examples ({rec.count} occurrences):</p>
                  <ul className="text-sm text-gray-600">
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
              </div>
            ))}
          </div>
          
          <div>
            <h2 className="text-xl font-bold mb-3">Detected Anomalies</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border">User</th>
                    <th className="px-4 py-2 border">Activity</th>
                    <th className="px-4 py-2 border">Risk Score</th>
                    <th className="px-4 py-2 border">Anomaly Score</th>
                    <th className="px-4 py-2 border">Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {results.anomalies.slice(0, 10).map((anomaly, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 border">{anomaly.user}</td>
                      <td className="px-4 py-2 border">{anomaly.integration}</td>
                      <td className="px-4 py-2 border">{anomaly.riskScore}</td>
                      <td className="px-4 py-2 border">{anomaly.anomalyScore.toFixed(2)}</td>
                      <td className="px-4 py-2 border">
                        <ul className="list-disc pl-4 text-sm">
                          {anomaly.anomalyFactors.map((factor, i) => (
                            <li key={i}>{factor}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.anomalies.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                Showing 10 of {results.anomalies.length} anomalies
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
} 