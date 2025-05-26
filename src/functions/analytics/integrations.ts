/**
 * UIUX/src/functions/analytics/integrations.ts
 * 
 * This file provides integration between the UIUX project and the external src/functions
 * It should be updated to reference the external directory once project structure is finalized
 */

import type { TimelineDataPoint } from '../../../types';

// Mock data for risk distribution
export const getRiskDistribution = () => [
  { name: 'Low Risk', value: 35, color: '#4caf50' },
  { name: 'Medium Risk', value: 30, color: '#2196f3' },
  { name: 'High Risk', value: 25, color: '#ff9800' },
  { name: 'Critical Risk', value: 10, color: '#f44336' },
];

// Mock data for policy breach distribution
export const getPolicyBreachDistribution = () => [
  { name: 'Data Leakage', value: 32, color: '#f44336' },
  { name: 'PII', value: 25, color: '#ff9800' },
  { name: 'Sensitive Data', value: 18, color: '#3f51b5' },
  { name: 'Financial', value: 15, color: '#673ab7' },
  { name: 'User At Risk', value: 10, color: '#2196f3' },
];

// Mock data for user activity by day of week
export const getUserActivityByDay = () => [
  {
    user: 'alex.morgan@example.com',
    monday: 12,
    tuesday: 8,
    wednesday: 15,
    thursday: 10,
    friday: 7,
    saturday: 2,
    sunday: 1,
    avgRiskScore: 1250,
  },
  {
    user: 'susan.white@example.com',
    monday: 8,
    tuesday: 10,
    wednesday: 9,
    thursday: 15,
    friday: 11,
    saturday: 3,
    sunday: 1,
    avgRiskScore: 1420,
  },
  {
    user: 'david.chen@example.com',
    monday: 10,
    tuesday: 9,
    wednesday: 12,
    thursday: 8,
    friday: 7,
    saturday: 4,
    sunday: 2,
    avgRiskScore: 950,
  },
];

// Generate timeline data for activity trends
export const getTimelineData = (days: number = 30): TimelineDataPoint[] => {
  const timelineData: TimelineDataPoint[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate random data
    const low = Math.floor(Math.random() * 10);
    const medium = Math.floor(Math.random() * 8);
    const high = Math.floor(Math.random() * 5);
    const critical = Math.floor(Math.random() * 3);
    
    timelineData.unshift({
      date: dateStr,
      low,
      medium,
      high,
      critical,
      total: low + medium + high + critical
    });
  }
  
  return timelineData;
};

// TODO: Implement actual integrations with external src/functions
// This would include:
// 1. Importing and processing data from src/utils/csvProcessor.ts
// 2. Using the ML recommendation engine from src/ml/recommendationEngine.ts
// 3. Fetching actual risk assessment data

/**
 * In production, this would call the actual Functions implementation
 * For now, we're returning mock data
 */
export const getRecommendations = () => {
  return [
    {
      id: '1',
      title: 'High Risk Activity Detected',
      description: 'Unusual pattern of high-severity activities detected',
      severity: 'high' as const,
      confidence: 0.85,
      affectedUsers: ['alex.morgan@example.com'],
      suggestedActions: [
        'Review recent user activities',
        'Implement additional monitoring',
        'Consider temporary access restrictions'
      ],
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Sensitive Data Access',
      description: 'Multiple users accessing sensitive information outside normal hours',
      severity: 'medium' as const,
      confidence: 0.76,
      affectedUsers: ['susan.white@example.com', 'david.chen@example.com'],
      suggestedActions: [
        'Review data access policies',
        'Implement time-based restrictions',
        'Monitor for similar patterns'
      ],
      timestamp: new Date().toISOString()
    }
  ];
}; 