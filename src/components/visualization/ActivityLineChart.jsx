import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const ActivityLineChart = ({ data, title }) => {
  return (
    <div className="w-full h-[400px] p-4 bg-white rounded-lg shadow">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="activityCount"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
          {data[0]?.riskScore !== undefined && (
            <Line
              type="monotone"
              dataKey="riskScore"
              stroke="#ff7300"
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityLineChart; 