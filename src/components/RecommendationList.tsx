import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Stack,
  Divider,
  LinearProgress,
} from '@mui/material';
import { MLRecommendation } from '../types/UserActivityType';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

interface RecommendationListProps {
  recommendations: MLRecommendation[];
}

export const RecommendationList: React.FC<RecommendationListProps> = ({ recommendations }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.6);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.75) return 'info';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  // Apply filters to recommendations
  const filteredRecommendations = recommendations.filter(rec => {
    // Apply severity filter
    if (severityFilter !== 'all' && rec.severity !== severityFilter) {
      return false;
    }

    // Apply confidence threshold
    if (rec.confidence < confidenceThreshold) {
      return false;
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        rec.title.toLowerCase().includes(query) ||
        rec.description.toLowerCase().includes(query) ||
        rec.affectedUsers.some(user => user.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Security Recommendations
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Based on ML analysis of {recommendations.length} security patterns
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Search Recommendations"
            variant="outlined"
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="severity-filter-label">Severity</InputLabel>
            <Select
              labelId="severity-filter-label"
              id="severity-filter"
              value={severityFilter}
              label="Severity"
              onChange={(e) => setSeverityFilter(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <FilterListIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All Severities</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="confidence-threshold-label">Min Confidence</InputLabel>
            <Select
              labelId="confidence-threshold-label"
              id="confidence-threshold"
              value={confidenceThreshold.toString()}
              label="Min Confidence"
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
            >
              <MenuItem value="0.9">High (90%+)</MenuItem>
              <MenuItem value="0.75">Medium (75%+)</MenuItem>
              <MenuItem value="0.6">Low (60%+)</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2">
            {filteredRecommendations.length} recommendations
          </Typography>
          
          {searchQuery && (
            <Chip 
              label={`Search: "${searchQuery}"`} 
              onDelete={() => setSearchQuery('')}
              size="small"
            />
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {filteredRecommendations.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 5 }}>
                <Typography variant="h6" color="text.secondary">
                  No recommendations match your criteria
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try adjusting your filters or search query
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          filteredRecommendations.map((recommendation) => (
            <Grid item xs={12} md={6} key={recommendation.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {recommendation.title}
                    </Typography>
                    <Chip
                      label={recommendation.severity}
                      color={getSeverityColor(recommendation.severity)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography color="text.secondary" gutterBottom>
                    {recommendation.description}
                  </Typography>
                  
                  <Box sx={{ my: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Confidence: {(recommendation.confidence * 100).toFixed(1)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={recommendation.confidence * 100} 
                      color={getConfidenceColor(recommendation.confidence)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Affected Users:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {recommendation.affectedUsers.map((user) => (
                        <Chip
                          key={user}
                          label={user}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suggested Actions:
                    </Typography>
                    <List dense>
                      {recommendation.suggestedActions.map((action, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemText 
                            primary={action} 
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'right' }}>
                    {new Date(recommendation.timestamp).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}; 