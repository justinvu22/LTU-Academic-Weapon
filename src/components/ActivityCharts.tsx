import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Card, CardContent, Typography, Grid } from '@mui/material';
import { UserActivityStats } from '../types/UserActivityType';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ActivityChartsProps {
  stats: UserActivityStats;
}

export const ActivityCharts: React.FC<ActivityChartsProps> = ({ stats }) => {
  // Risk Score Distribution Chart
  const riskScoreData = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [
      {
        label: 'Number of Activities',
        data: [
          stats.riskScoreDistribution.low,
          stats.riskScoreDistribution.medium,
          stats.riskScoreDistribution.high,
          stats.riskScoreDistribution.critical,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
      },
    ],
  };

  // Integration Breakdown Chart
  const integrationData = {
    labels: ['Email', 'Cloud', 'USB', 'Application'],
    datasets: [
      {
        data: [
          stats.integrationBreakdown.email,
          stats.integrationBreakdown.cloud,
          stats.integrationBreakdown.usb,
          stats.integrationBreakdown.application,
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
      },
    ],
  };

  // Breach Categories Chart
  const breachData = {
    labels: Object.keys(stats.breachCategories),
    datasets: [
      {
        label: 'Number of Breaches',
        data: Object.values(stats.breachCategories),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  // Time Distribution Chart
  const timeData = {
    labels: ['Morning', 'Afternoon', 'Evening'],
    datasets: [
      {
        label: 'Activities by Time',
        data: [
          stats.timeDistribution.morning,
          stats.timeDistribution.afternoon,
          stats.timeDistribution.evening,
        ],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Risk Score Distribution
            </Typography>
            <Bar
              data={riskScoreData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Integration Breakdown
            </Typography>
            <Pie
              data={integrationData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Breach Categories
            </Typography>
            <Bar
              data={breachData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Time Distribution
            </Typography>
            <Line
              data={timeData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}; 