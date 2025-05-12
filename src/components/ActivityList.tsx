import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import { UserActivity } from '../types/UserActivityType';

interface ActivityListProps {
  activities: UserActivity[];
  onActivitySelect?: (activity: UserActivity) => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities, onActivitySelect }) => {
  const getRiskScoreColor = (score: number) => {
    if (score < 1000) return 'success';
    if (score < 1500) return 'info';
    if (score < 2000) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trusted':
        return 'success';
      case 'underReview':
        return 'info';
      case 'concern':
        return 'warning';
      case 'nonConcern':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatBreaches = (breaches: any) => {
    // Flatten all policy names from all categories
    const policyNames: string[] = [];
    Object.values(breaches).forEach((arr) => {
      if (Array.isArray(arr)) {
        policyNames.push(...arr);
      }
    });
    return policyNames.map((policy) => (
      <Chip
        key={policy}
        label={policy}
        size="small"
        sx={{ mr: 0.5, mb: 0.5 }}
      />
    ));
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Date & Time</TableCell>
            <TableCell>Integration</TableCell>
            <TableCell>Risk Score</TableCell>
            <TableCell>Policies Breached</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Manager Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activities.map((activity) => (
            <TableRow 
              key={activity.activityId}
              onClick={() => onActivitySelect && onActivitySelect(activity)}
              sx={{ 
                cursor: onActivitySelect ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: onActivitySelect ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                }
              }}
            >
              <TableCell>{activity.user}</TableCell>
              <TableCell>
                {activity.date} {activity.time}
              </TableCell>
              <TableCell>
                <Chip
                  label={activity.integration.replace('si-', '')}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={activity.riskScore}
                  color={getRiskScoreColor(activity.riskScore)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {formatBreaches(activity.policiesBreached)}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={activity.status}
                  color={getStatusColor(activity.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {activity.managerAction && (
                  <Chip
                    label={activity.managerAction}
                    size="small"
                    variant="outlined"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 