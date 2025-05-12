import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { UserActivity } from '../types/UserActivityType';
import { generateAnalystComment } from '../ml/recommendationEngine';

interface ActivityDetailProps {
  activity: UserActivity;
}

/**
 * Component to display detailed information about a selected activity
 * Including ML-generated analyst comments
 */
export const ActivityDetail: React.FC<ActivityDetailProps> = ({ activity }) => {
  const {
    activityId,
    user,
    date,
    time,
    riskScore,
    integration,
    policiesBreached,
    values,
    status,
    managerAction,
  } = activity;

  // Generate analyst comment using ML
  const analystComment = generateAnalystComment(activity);

  // Helper function to determine risk level color
  const getRiskLevelColor = (score: number) => {
    if (score > 2000) return 'error';
    if (score > 1500) return 'warning';
    if (score > 1000) return 'info';
    return 'success';
  };

  // Get all policy breach values as a flattened array
  const getPolicyBreaches = () => {
    const breaches: string[] = [];
    Object.entries(policiesBreached).forEach(([category, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        breaches.push(...items);
      }
    });
    return breaches;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Activity Details
        </Typography>
        
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">User</Typography>
                  <Typography>{user}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Date & Time</Typography>
                  <Typography>{date} {time}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Activity ID</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {activityId}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Risk Score</Typography>
                  <Chip 
                    label={riskScore} 
                    color={getRiskLevelColor(riskScore)}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Integration</Typography>
                  <Chip label={integration.replace('si-', '')} size="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip 
                    label={status} 
                    color={status === 'trusted' ? 'success' : 
                           status === 'concern' ? 'warning' : 
                           status === 'nonConcern' ? 'info' : 'default'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Breach Details */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Policy Breaches
                </Typography>
                <List dense>
                  {getPolicyBreaches().map((breach, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={breach} />
                    </ListItem>
                  ))}
                </List>
                
                {values && Object.keys(values).length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Additional Details
                    </Typography>
                    
                    {values.destinations && values.destinations.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">Destinations</Typography>
                        {values.destinations.map((dest, i) => (
                          <Chip 
                            key={i} 
                            label={dest} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                        ))}
                      </Box>
                    )}
                    
                    {values.cloudProvider && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">Cloud Provider</Typography>
                        <Typography>{values.cloudProvider}</Typography>
                      </Box>
                    )}
                    
                    {values.device && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">Device</Typography>
                        <Typography>{values.device}</Typography>
                      </Box>
                    )}
                    
                    {values.application && (
                      <Box>
                        <Typography variant="subtitle2">Application</Typography>
                        <Typography>{values.application}</Typography>
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Analyst Comments & Recommendations */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analyst Comments
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {analystComment}
                </Typography>
                
                {managerAction && (
                  <>
                    <Divider sx={{ my: 2, borderColor: 'primary.main' }} />
                    <Typography variant="h6" gutterBottom>
                      Manager Action
                    </Typography>
                    <Chip 
                      label={managerAction} 
                      color="secondary"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}; 