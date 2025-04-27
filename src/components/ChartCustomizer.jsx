import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { LineChart, BarChart, PieChart, ScatterChart } from 'recharts';

const ChartCustomizer = ({ data, onDrillDown }) => {
  const { settings, updateSettings } = useSettings();
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);

  const chartTypes = [
    { id: 'timeline', label: 'Timeline', component: LineChart },
    { id: 'bar', label: 'Bar Chart', component: BarChart },
    { id: 'pie', label: 'Pie Chart', component: PieChart },
    { id: 'scatter', label: 'Scatter Plot', component: ScatterChart }
  ];

  const metrics = [
    { id: 'riskScore', label: 'Risk Score' },
    { id: 'activityCount', label: 'Activity Count' },
    { id: 'anomalyScore', label: 'Anomaly Score' }
  ];

  const handleChartTypeChange = (type) => {
    updateSettings({ chartType: type });
  };

  const handleMetricToggle = (metric) => {
    const newMetrics = settings.selectedMetrics.includes(metric)
      ? settings.selectedMetrics.filter(m => m !== metric)
      : [...settings.selectedMetrics, metric];
    updateSettings({ selectedMetrics: newMetrics });
  };

  const handleDataPointClick = (dataPoint) => {
    setSelectedDataPoint(dataPoint);
    if (onDrillDown) {
      onDrillDown(dataPoint);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-lg font-semibold mb-2">Chart Type</h3>
          <div className="flex flex-wrap gap-2">
            {chartTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleChartTypeChange(type.id)}
                className={`px-3 py-1 rounded ${
                  settings.chartType === type.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <h3 className="text-lg font-semibold mb-2">Metrics</h3>
          <div className="flex flex-wrap gap-2">
            {metrics.map(metric => (
              <button
                key={metric.id}
                onClick={() => handleMetricToggle(metric.id)}
                className={`px-3 py-1 rounded ${
                  settings.selectedMetrics.includes(metric.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedDataPoint && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Selected Data Point</h4>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(selectedDataPoint, null, 2)}
          </pre>
          <button
            onClick={() => setSelectedDataPoint(null)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default ChartCustomizer; 