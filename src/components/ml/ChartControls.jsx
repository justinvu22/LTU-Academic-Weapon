import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { useSettings } from '../../context/SettingsContext';

const ChartControls = ({ anomalies }) => {
  const { settings } = useSettings();
  const [selectedChart, setSelectedChart] = useState(settings.chartType);
  const [selectedMetric, setSelectedMetric] = useState(settings.selectedMetrics[0]);

  const COLORS = ['#16a34a', '#eab308', '#dc2626'];
  const RISK_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Prepare data for different chart types
  const prepareTimelineData = () => {
    // Group data by date and calculate risk levels
    const groupedData = anomalies.reduce((acc, a) => {
      // Parse DD/MM/YYYY format to YYYY-MM-DD
      const [day, month, year] = a.date.split('/');
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const date = new Date(`${formattedDate}T${a.time}`);
      const dateKey = formattedDate;
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          timestamp: date.getTime(),
          series1: 0,
          series2: 0,
          series3: 0,
          series4: 0,
          total: 0
        };
      }

      // Categorize risk scores into series
      const score = a.riskScore;
      if (score >= 2000) acc[dateKey].series1++;
      else if (score >= 1500) acc[dateKey].series2++;
      else if (score >= 1000) acc[dateKey].series3++;
      else acc[dateKey].series4++;
      
      acc[dateKey].total++;
      return acc;
    }, {});

    // Convert to array and sort by date
    return Object.values(groupedData)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const prepareUserActivityData = () => {
    const userMap = new Map();
    anomalies.forEach(a => {
      if (!userMap.has(a.user)) {
        userMap.set(a.user, {
          user: a.user,
          activityCount: 0,
          avgRiskScore: 0,
          totalRiskScore: 0
        });
      }
      const userData = userMap.get(a.user);
      userData.activityCount++;
      userData.totalRiskScore += a.riskScore;
      userData.avgRiskScore = userData.totalRiskScore / userData.activityCount;
    });
    return Array.from(userMap.values());
  };

  const prepareRiskDistributionData = () => {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0
    };

    anomalies.forEach(a => {
      if (a.riskScore >= 2000) distribution.high++;
      else if (a.riskScore >= 1000) distribution.medium++;
      else distribution.low++;
    });

    return [
      { name: 'Low Risk', value: distribution.low },
      { name: 'Medium Risk', value: distribution.medium },
      { name: 'High Risk', value: distribution.high }
    ];
  };

  const prepareHeatmapData = () => {
    const heatmapData = [];
    
    // Initialize the heatmap data structure
    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        heatmapData.push({
          day,
          hour,
          value: 0,
          count: 0
        });
      });
    });

    // Populate the heatmap data
    anomalies.forEach(anomaly => {
      const date = new Date(`${anomaly.date} ${anomaly.time}`);
      const day = DAYS[date.getDay()];
      const hour = date.getHours();
      
      const dataPoint = heatmapData.find(d => d.day === day && d.hour === hour);
      if (dataPoint) {
        dataPoint.value += selectedMetric === 'riskScore' ? anomaly.riskScore : 1;
        dataPoint.count++;
      }
    });

    // Calculate averages
    heatmapData.forEach(point => {
      if (point.count > 0) {
        point.value = point.value / point.count;
      }
    });

    return heatmapData;
  };

  const renderHeatmap = () => {
    const data = prepareHeatmapData();
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="w-full overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2">Day/Hour</th>
              {HOURS.map(hour => (
                <th key={hour} className="border p-2">{hour}:00</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                <td className="border p-2 font-medium">{day}</td>
                {HOURS.map(hour => {
                  const point = data.find(d => d.day === day && d.hour === hour);
                  const value = point ? point.value : 0;
                  const intensity = value / maxValue;
                  
                  return (
                    <td
                      key={`${day}-${hour}`}
                      className="border p-2"
                      style={{
                        backgroundColor: `rgba(220, 38, 38, ${intensity})`,
                        color: intensity > 0.5 ? 'white' : 'black'
                      }}
                    >
                      {value.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderChart = () => {
    switch (selectedChart) {
      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={prepareTimelineData()}>
              <defs>
                {RISK_COLORS.map((color, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value, name) => [value, name.replace('series', 'Risk Level ')]}
              />
              <Legend 
                formatter={(value) => value.replace('series', 'Risk Level ')}
              />
              <Area
                type="monotone"
                dataKey="series1"
                stackId="1"
                stroke={RISK_COLORS[0]}
                fill={`url(#gradient-0)`}
                name="series1"
              />
              <Area
                type="monotone"
                dataKey="series2"
                stackId="1"
                stroke={RISK_COLORS[1]}
                fill={`url(#gradient-1)`}
                name="series2"
              />
              <Area
                type="monotone"
                dataKey="series3"
                stackId="1"
                stroke={RISK_COLORS[2]}
                fill={`url(#gradient-2)`}
                name="series3"
              />
              <Area
                type="monotone"
                dataKey="series4"
                stackId="1"
                stroke={RISK_COLORS[3]}
                fill={`url(#gradient-3)`}
                name="series4"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'userActivity':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={prepareUserActivityData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="user" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey={selectedMetric === 'riskScore' ? 'avgRiskScore' : 'activityCount'}
                fill="#0ea5e9"
                name={selectedMetric === 'riskScore' ? 'Average Risk Score' : 'Activity Count'}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'riskDistribution':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={prepareRiskDistributionData()}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label
              >
                {prepareRiskDistributionData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        return (
          <div className="mt-4">
            <div className="mb-4">
              <label className="mr-4">Metric:</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="riskScore">Average Risk Score</option>
                <option value="activityCount">Activity Count</option>
              </select>
            </div>
            {renderHeatmap()}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Risk Levels by Time</h2>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setSelectedChart('timeline')}
          className={`px-4 py-2 rounded-lg ${
            selectedChart === 'timeline'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Risk Timeline
        </button>
        <button
          onClick={() => setSelectedChart('userActivity')}
          className={`px-4 py-2 rounded-lg ${
            selectedChart === 'userActivity'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          User Activity
        </button>
        <button
          onClick={() => setSelectedChart('riskDistribution')}
          className={`px-4 py-2 rounded-lg ${
            selectedChart === 'riskDistribution'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Risk Distribution
        </button>
        <button
          onClick={() => setSelectedChart('heatmap')}
          className={`px-4 py-2 rounded-lg ${
            selectedChart === 'heatmap'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Activity Heatmap
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartControls; 