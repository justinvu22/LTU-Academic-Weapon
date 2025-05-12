import React from 'react';
import { UserActivityStats } from '../types/UserActivityType';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  LinearProgress,
} from '@mui/material';

interface ActivityStatsProps {
  stats: UserActivityStats;
}

export const ActivityStats: React.FC<ActivityStatsProps> = ({ stats }) => {
  const formatPercentage = (value: number, total: number) => {
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <Grid container spacing={3}>
      {/* Overview Cards */}
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Activities
            </Typography>
            <Typography variant="h4">
              {stats.totalActivities}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Average Risk Score
            </Typography>
            <Typography variant="h4">
              {Math.round(stats.averageRiskScore)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Risk Score Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Risk Score Distribution
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Low ({stats.riskScoreDistribution.low})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.riskScoreDistribution.low / stats.totalActivities) * 100}
                color="success"
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Medium ({stats.riskScoreDistribution.medium})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.riskScoreDistribution.medium / stats.totalActivities) * 100}
                color="info"
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                High ({stats.riskScoreDistribution.high})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.riskScoreDistribution.high / stats.totalActivities) * 100}
                color="warning"
              />
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Critical ({stats.riskScoreDistribution.critical})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.riskScoreDistribution.critical / stats.totalActivities) * 100}
                color="error"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Integration Breakdown */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Integration Breakdown
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Email ({stats.integrationBreakdown.email})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.integrationBreakdown.email / stats.totalActivities) * 100}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Cloud ({stats.integrationBreakdown.cloud})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.integrationBreakdown.cloud / stats.totalActivities) * 100}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                USB ({stats.integrationBreakdown.usb})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.integrationBreakdown.usb / stats.totalActivities) * 100}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Application ({stats.integrationBreakdown.application})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.integrationBreakdown.application / stats.totalActivities) * 100}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Status Breakdown */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status Breakdown
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Under Review ({stats.statusBreakdown.underReview})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.statusBreakdown.underReview / stats.totalActivities) * 100}
                color="info"
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Trusted ({stats.statusBreakdown.trusted})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.statusBreakdown.trusted / stats.totalActivities) * 100}
                color="success"
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Concern ({stats.statusBreakdown.concern})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.statusBreakdown.concern / stats.totalActivities) * 100}
                color="warning"
              />
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Non-Concern ({stats.statusBreakdown.nonConcern})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.statusBreakdown.nonConcern / stats.totalActivities) * 100}
                color="error"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Time Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Time Distribution
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Morning ({stats.timeDistribution.morning})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.timeDistribution.morning / stats.totalActivities) * 100}
                color="info"
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Afternoon ({stats.timeDistribution.afternoon})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.timeDistribution.afternoon / stats.totalActivities) * 100}
                color="success"
              />
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Evening ({stats.timeDistribution.evening})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.timeDistribution.evening / stats.totalActivities) * 100}
                color="warning"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}; 