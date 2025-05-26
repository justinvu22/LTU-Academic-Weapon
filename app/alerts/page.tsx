"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { Typography, Box, Paper, CircularProgress, Tabs, Tab, Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Collapse, ToggleButton, ToggleButtonGroup, Slider, Badge, Tooltip, InputAdornment, LinearProgress } from '@mui/material';
import { ActivityList } from '@components/ActivityList';
import { UserActivity, MLAlertItem } from '../../types/activity';
import { policyIcons } from '@constants/policyIcons';
import { AlertDetailsModal } from '@components/AlertDetailsModal';
import { AlertsManager } from '../../utils/alertsManager';
import '@fontsource/poppins/600.css';
import { FaSyncAlt } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';
import {
  FilterList,
  ExpandMore,
  ExpandLess,
  Clear,
  Search,
  Schedule,
  Warning,
  Security,
  TrendingUp,
  People,
  Speed,
  Visibility,
  AssignmentInd
} from '@mui/icons-material';

/**
 * Custom styled version of ActivityList that fills the container
 */
const FullHeightActivityList: React.FC<{
  activities: UserActivity[];
  policyIcons: Record<string, React.ReactNode>;
}> = ({ activities, policyIcons }) => {
  return (
    <Box sx={{ 
      height: '100%', 
      '& .MuiTableContainer-root': {
        maxHeight: 'none',
        height: '100%',
        borderRadius: 0,
        boxShadow: 'none'
      },
      '& .MuiTable-root': {
        height: '100%' 
      }
    }}>
      <ActivityList 
        activities={activities} 
        policyIcons={policyIcons}
      />
    </Box>
  );
};

// Custom debounce function to replace lodash
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Filter interfaces
interface FilterPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  filters: Partial<ActivityFilters>;
  color: string;
}

interface ActivityFilters {
  searchTerm: string;
  users: string[];
  riskScoreRange: [number, number];
  dateRange: [string, string];
  timeRange: [number, number];
  activityTypes: string[];
  locations: string[];
  policies: string[];
  status: string[];
  integrations: string[];
  managerActions: string[];
  criticalHoursOnly?: boolean;
  weekendOnly?: boolean;
}

interface FilterSuggestion {
  type: 'user' | 'time' | 'risk' | 'policy' | 'integration';
  value: any;
  reason: string;
  confidence: number;
}

// AdaptiveActivityFilter Component
const AdaptiveActivityFilter: React.FC<{
  activities: UserActivity[];
  onFilterChange: (filteredActivities: UserActivity[]) => void;
  onFilteringProgress?: (progress: number) => void;
}> = ({ activities, onFilterChange, onFilteringProgress }) => {
  const [filters, setFilters] = useState<ActivityFilters>({
    searchTerm: '',
    users: [],
    riskScoreRange: [0, 3000],
    dateRange: ['', ''],
    timeRange: [0, 23],
    activityTypes: [],
    locations: [],
    policies: [],
    status: [],
    integrations: [],
    managerActions: [],
    criticalHoursOnly: false,
    weekendOnly: false
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [filterSuggestions, setFilterSuggestions] = useState<FilterSuggestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activityTypeSearch, setActivityTypeSearch] = useState('');

  // Filter presets for quick access
  const filterPresets: FilterPreset[] = [
    {
      id: 'critical',
      name: 'Critical Alerts',
      icon: <Warning />,
      description: 'High-risk activities requiring immediate attention',
      filters: {
        riskScoreRange: [2000, 3000],
        status: ['concern', 'underReview']
      },
      color: '#EF4444'
    },
    {
      id: 'afterhours',
      name: 'After Hours',
      icon: <Schedule />,
      description: 'Activities outside business hours (1-3 AM focus)',
      filters: {
        timeRange: [22, 6],
        criticalHoursOnly: true
      },
      color: '#8B5CF6'
    },
    {
      id: 'usb',
      name: 'USB Activities',
      icon: <Security />,
      description: 'USB device activities (higher risk)',
      filters: {
        integrations: ['usb', 'crowdstrike-usb']
      },
      color: '#F59E0B'
    },
    {
      id: 'dataleaks',
      name: 'Data Leaks',
      icon: <TrendingUp />,
      description: 'Potential data exfiltration activities',
      filters: {
        policies: ['dataLeakage', 'pii', 'phi', 'financial']
      },
      color: '#10B981'
    }
  ];

  // Analyze data patterns and extract filter options
  const filterOptions = useMemo(() => {
    const users = new Set<string>();
    const activityTypes = new Set<string>();
    const locations = new Set<string>();
    const policies = new Set<string>();
    const statuses = new Set<string>();
    const integrations = new Set<string>();
    const managerActions = new Set<string>();
    
    let minRisk = Infinity;
    let maxRisk = -Infinity;
    let minDate = '';
    let maxDate = '';
    
    const hourlyActivity = new Array(24).fill(0);
    const criticalHourActivity = new Map<number, number>();

    activities.forEach(activity => {
      const user = activity.username || activity.user || activity.userId;
      if (user) users.add(user);

      if (activity.activityType) activityTypes.add(activity.activityType);
      if (activity.activity) activityTypes.add(activity.activity);
      if (activity.location) locations.add(activity.location);
      if (activity.integration) integrations.add(activity.integration);
      if (activity.managerAction) managerActions.add(activity.managerAction);

      if (activity.policiesBreached) {
        if (typeof activity.policiesBreached === 'object') {
          Object.keys(activity.policiesBreached).forEach(policy => policies.add(policy));
        }
      }

      if (activity.status) statuses.add(activity.status);

      const riskScore = activity.riskScore || 0;
      minRisk = Math.min(minRisk, riskScore);
      maxRisk = Math.max(maxRisk, riskScore);

      if (activity.hour !== undefined && activity.hour !== null) {
        hourlyActivity[activity.hour]++;
        if ([1, 2, 3].includes(activity.hour)) {
          criticalHourActivity.set(activity.hour, (criticalHourActivity.get(activity.hour) || 0) + 1);
        }
      }

      let dateStr = '';
      if (activity.timestamp) {
        dateStr = activity.timestamp.split('T')[0];
      } else if (activity.date) {
        if (activity.date.includes('/')) {
          const parts = activity.date.split('/');
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        } else {
          dateStr = activity.date;
        }
      }
      
      if (dateStr) {
        if (!minDate || dateStr < minDate) minDate = dateStr;
        if (!maxDate || dateStr > maxDate) maxDate = dateStr;
      }
    });

    const suggestions: FilterSuggestion[] = [];
    
    const totalActivities = activities.length;
    const criticalHourTotal = Array.from(criticalHourActivity.values()).reduce((a, b) => a + b, 0);
    if (criticalHourTotal > totalActivities * 0.2) {
      suggestions.push({
        type: 'time',
        value: [1, 3],
        reason: `${((criticalHourTotal / totalActivities) * 100).toFixed(1)}% of activities occur during 1-3 AM`,
        confidence: 0.95
      });
    }

    return {
      users: Array.from(users).sort(),
      activityTypes: Array.from(activityTypes).sort(),
      locations: Array.from(locations).sort(),
      policies: Array.from(policies).sort(),
      statuses: Array.from(statuses).sort(),
      integrations: Array.from(integrations).sort(),
      managerActions: Array.from(managerActions).sort(),
      riskRange: [minRisk === Infinity ? 0 : minRisk, maxRisk === -Infinity ? 3000 : maxRisk] as [number, number],
      dateRange: [minDate, maxDate] as [string, string],
      suggestions
    };
  }, [activities]);

  // Initialize filters with detected data ranges
  useEffect(() => {
    if (filterOptions.dateRange[0] && filterOptions.dateRange[1]) {
      setFilters(prev => ({
        ...prev,
        riskScoreRange: filterOptions.riskRange,
        dateRange: filterOptions.dateRange.every(d => d) ? filterOptions.dateRange : prev.dateRange
      }));
    }
  }, [filterOptions]);

  // Filtered activity types for performance
  const filteredActivityTypes = useMemo(() => {
    const types = filterOptions.activityTypes;
    if (!activityTypeSearch) {
      return types.slice(0, 100); // Limit to first 100 when no search
    }
    return types.filter(type => 
      type.toLowerCase().includes(activityTypeSearch.toLowerCase())
    ).slice(0, 50); // Limit to 50 when searching
  }, [filterOptions.activityTypes, activityTypeSearch]);

  // Set filter suggestions
  useEffect(() => {
    setFilterSuggestions(filterOptions.suggestions);
  }, [filterOptions.suggestions]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, searchTerm }));
    }, 300),
    []
  );

  // Apply filters with performance optimization
  const applyFilters = useCallback(async () => {
    setIsProcessing(true);
    onFilteringProgress?.(0);

    const chunkSize = 1000;
    const filteredResults: UserActivity[] = [];
    
    for (let i = 0; i < activities.length; i += chunkSize) {
      const chunk = activities.slice(i, i + chunkSize);
      
      const filteredChunk = chunk.filter(activity => {
        // Search term
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const searchableText = [
            activity.username,
            activity.user,
            activity.userId,
            activity.activityType,
            activity.activity,
            activity.location,
            activity.description
          ].filter(Boolean).join(' ').toLowerCase();
          
          if (!searchableText.includes(searchLower)) return false;
        }

        // User filter
        if (filters.users.length > 0) {
          const user = activity.username || activity.user || activity.userId;
          if (!user || !filters.users.includes(user)) return false;
        }

        // Risk score filter
        const riskScore = activity.riskScore || 0;
        if (riskScore < filters.riskScoreRange[0] || riskScore > filters.riskScoreRange[1]) {
          return false;
        }

        // Time filter
        if (filters.criticalHoursOnly) {
          const hour = activity.hour;
          if (hour === undefined || hour === null || ![1, 2, 3].includes(hour)) {
            return false;
          }
        }

        // Date filter
        if (filters.dateRange[0] || filters.dateRange[1]) {
          let activityDate = '';
  if (activity.timestamp) {
            activityDate = activity.timestamp.split('T')[0];
          } else if (activity.date) {
            if (activity.date.includes('/')) {
              const parts = activity.date.split('/');
              if (parts.length === 3) {
                activityDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            } else {
              activityDate = activity.date;
            }
          }

          if (filters.dateRange[0] && activityDate < filters.dateRange[0]) return false;
          if (filters.dateRange[1] && activityDate > filters.dateRange[1]) return false;
        }

        // Activity type filter
        if (filters.activityTypes.length > 0) {
          const activityType = activity.activityType || activity.activity;
          if (!activityType || !filters.activityTypes.includes(activityType)) return false;
        }

        // Integration filter
        if (filters.integrations.length > 0) {
          if (!activity.integration || !filters.integrations.includes(activity.integration)) return false;
        }

        return true;
      });

      filteredResults.push(...filteredChunk);
      
      const progress = ((i + chunkSize) / activities.length) * 100;
      onFilteringProgress?.(Math.min(progress, 100));
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    setIsProcessing(false);
    onFilteringProgress?.(100);
    onFilterChange(filteredResults);
  }, [activities, filters, onFilterChange, onFilteringProgress]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Apply preset
  const applyPreset = (preset: FilterPreset) => {
    setActivePreset(preset.id);
    setFilters(prev => ({
      ...prev,
      ...preset.filters
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActivePreset(null);
    setFilters({
      searchTerm: '',
      users: [],
      riskScoreRange: filterOptions.riskRange,
      dateRange: filterOptions.dateRange,
      timeRange: [0, 23],
      activityTypes: [],
      locations: [],
      policies: [],
      status: [],
      integrations: [],
      managerActions: [],
      criticalHoursOnly: false,
      weekendOnly: false
    });
  };

  // Count active filters
  const activeFilterCount = [
    filters.searchTerm,
    filters.users.length > 0,
    filters.riskScoreRange[0] !== filterOptions.riskRange[0] || filters.riskScoreRange[1] !== filterOptions.riskRange[1],
    (filters.dateRange[0] && filters.dateRange[0] !== filterOptions.dateRange[0]) || 
    (filters.dateRange[1] && filters.dateRange[1] !== filterOptions.dateRange[1]),
    filters.activityTypes.length > 0,
    filters.integrations.length > 0,
    filters.criticalHoursOnly
  ].filter(Boolean).length;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Quick Filter Presets */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {filterPresets.map((preset) => (
          <Tooltip key={preset.id} title={preset.description}>
            <Button
              variant={activePreset === preset.id ? 'contained' : 'outlined'}
              startIcon={preset.icon}
              onClick={() => applyPreset(preset)}
              size="small"
              sx={{
                borderColor: preset.color,
                color: activePreset === preset.id ? 'white' : preset.color,
                backgroundColor: activePreset === preset.id ? preset.color : 'transparent',
                '&:hover': {
                  borderColor: preset.color,
                  backgroundColor: activePreset === preset.id ? preset.color : `${preset.color}20`
                }
              }}
            >
              {preset.name}
            </Button>
          </Tooltip>
        ))}
      </Box>

      {/* Smart Suggestions */}
      {filterSuggestions.length > 0 && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: '#1F2030', borderRadius: 1, border: '1px solid #333' }}>
          <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 'bold', mb: 1, display: 'block' }}>
            <Speed sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
            Smart Filter Suggestions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filterSuggestions.map((suggestion, idx) => (
              <Chip
                key={idx}
                label={suggestion.reason}
                onClick={() => {
                  if (suggestion.type === 'time') {
                    setFilters(prev => ({ ...prev, criticalHoursOnly: true }));
                  } else if (suggestion.type === 'user') {
                    setFilters(prev => ({ ...prev, users: [suggestion.value] }));
                  }
                }}
                size="small"
                sx={{
                  backgroundColor: '#8B5CF620',
                  color: '#A78BFA',
                  '&:hover': { backgroundColor: '#8B5CF640' }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Main Filter Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          placeholder="Quick search activities, users, types..."
          onChange={(e) => debouncedSearch(e.target.value)}
          size="small"
          sx={{
            minWidth: 400,
            '& .MuiOutlinedInput-root': {
              color: '#EEE',
              backgroundColor: '#1F2030',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#8B5CF6' },
              '&.Mui-focused fieldset': { borderColor: '#8B5CF6' }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#9CA3AF' }} />
              </InputAdornment>
            )
          }}
        />
        
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{
            color: '#8B5CF6',
            borderColor: '#8B5CF6',
            '&:hover': {
              borderColor: '#A78BFA',
              backgroundColor: 'rgba(139, 92, 246, 0.08)'
            }
          }}
        >
          <Badge badgeContent={activeFilterCount} color="secondary">
            Advanced Filters
          </Badge>
        </Button>
        
        {activeFilterCount > 0 && (
          <Button
            variant="text"
            startIcon={<Clear />}
            onClick={clearAllFilters}
            sx={{ color: '#EF4444' }}
          >
            Clear All
          </Button>
        )}

        {isProcessing && (
          <Box sx={{ flex: 1, mx: 2 }}>
            <LinearProgress sx={{ 
              '& .MuiLinearProgress-bar': { 
                backgroundColor: '#8B5CF6' 
              }
            }} />
          </Box>
        )}
      </Box>

      {/* Advanced Filters Panel */}
      <Collapse in={isExpanded}>
        <Paper sx={{ 
          p: 3, 
          backgroundColor: '#1F2030', 
          border: '1px solid #333',
          borderRadius: 2
        }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 3 }}>
            {/* Users */}
            <FormControl size="small">
              <InputLabel sx={{ color: '#9CA3AF' }}>
                <People sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                Users ({filterOptions.users.length})
              </InputLabel>
              <Select
                multiple
                value={filters.users}
                onChange={(e) => setFilters(prev => ({ ...prev, users: e.target.value as string[] }))}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).slice(0, 3).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                    {(selected as string[]).length > 3 && (
                      <Chip label={`+${(selected as string[]).length - 3} more`} size="small" />
                    )}
                  </Box>
                )}
                sx={{
                  color: '#EEE',
                  backgroundColor: '#1F2030',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8B5CF6' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8B5CF6' }
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      backgroundColor: '#1F2030',
                      border: '1px solid #444'
                    }
                  }
                }}
              >
                {filterOptions.users.slice(0, 100).map((user) => (
                  <MenuItem key={user} value={user} sx={{ color: '#EEE' }}>
                    {user}
                  </MenuItem>
                ))}
                {filterOptions.users.length > 100 && (
                  <MenuItem disabled sx={{ color: '#666' }}>
                    ... and {filterOptions.users.length - 100} more users
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Activity Types with Search */}
            <Box>
              <TextField
                placeholder="Search activity types..."
                value={activityTypeSearch}
                onChange={(e) => setActivityTypeSearch(e.target.value)}
                size="small"
                sx={{
                  width: '100%',
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    color: '#EEE',
                    backgroundColor: '#1F2030',
                    '& fieldset': { borderColor: '#444' }
                  }
                }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ color: '#9CA3AF' }}>
                  Activity Types ({filteredActivityTypes.length}/{filterOptions.activityTypes.length})
                </InputLabel>
                <Select
                  multiple
                  value={filters.activityTypes}
                  onChange={(e) => setFilters(prev => ({ ...prev, activityTypes: e.target.value as string[] }))}
                  renderValue={(selected) => `${(selected as string[]).length} selected`}
                  sx={{
                    color: '#EEE',
                    backgroundColor: '#1F2030',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        backgroundColor: '#1F2030',
                        border: '1px solid #444'
                      }
                    }
                  }}
                >
                  {filteredActivityTypes.map((type) => (
                    <MenuItem key={type} value={type} sx={{ color: '#EEE' }}>
                      {type}
                    </MenuItem>
                  ))}
                  {!activityTypeSearch && filterOptions.activityTypes.length > 100 && (
                    <MenuItem disabled sx={{ color: '#666' }}>
                      Type to search through all {filterOptions.activityTypes.length} types
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>

            {/* Date Range */}
            <Box>
              <Typography variant="caption" sx={{ color: '#9CA3AF', mb: 1, display: 'block' }}>
                Date Range 
                {filterOptions.dateRange[0] && filterOptions.dateRange[1] && (
                  <span style={{ color: '#8B5CF6' }}> ({filterOptions.dateRange[0]} to {filterOptions.dateRange[1]})</span>
                )}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  type="date"
                  value={filters.dateRange[0]}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: [e.target.value, prev.dateRange[1]] 
                  }))}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#EEE',
                      backgroundColor: '#1F2030',
                      '& fieldset': { borderColor: '#444' }
                    }
                  }}
                />
                <TextField
                  type="date"
                  value={filters.dateRange[1]}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: [prev.dateRange[0], e.target.value] 
                  }))}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#EEE',
                      backgroundColor: '#1F2030',
                      '& fieldset': { borderColor: '#444' }
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Risk Score Range */}
            <Box>
              <Typography variant="caption" sx={{ color: '#9CA3AF', mb: 1, display: 'block' }}>
                Risk Score Range ({filters.riskScoreRange[0]} - {filters.riskScoreRange[1]})
              </Typography>
              <Slider
                value={filters.riskScoreRange}
                onChange={(_, value) => setFilters(prev => ({ ...prev, riskScoreRange: value as [number, number] }))}
                valueLabelDisplay="auto"
                min={filterOptions.riskRange[0]}
                max={filterOptions.riskRange[1]}
                sx={{
                  color: '#8B5CF6',
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(to right, #10B981, #F59E0B, #EF4444)'
                  }
                }}
              />
            </Box>

            {/* Integrations */}
            <FormControl size="small">
              <InputLabel sx={{ color: '#9CA3AF' }}>
                <Security sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                Integrations ({filterOptions.integrations.length})
              </InputLabel>
              <Select
                multiple
                value={filters.integrations}
                onChange={(e) => setFilters(prev => ({ ...prev, integrations: e.target.value as string[] }))}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip 
                        key={value} 
                        label={value} 
                        size="small" 
                        sx={{ 
                          backgroundColor: value.includes('usb') ? '#F5930620' : '#8B5CF620'
                        }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  color: '#EEE',
                  backgroundColor: '#1F2030',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' }
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      backgroundColor: '#1F2030',
                      border: '1px solid #444'
                    }
                  }
                }}
              >
                {filterOptions.integrations.map((integration) => (
                  <MenuItem key={integration} value={integration} sx={{ color: '#EEE' }}>
                    {integration}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Special Time Filters */}
            <Box>
              <Typography variant="caption" sx={{ color: '#9CA3AF', mb: 1, display: 'block' }}>
                Special Time Filters
              </Typography>
              <ToggleButtonGroup
                value={filters.criticalHoursOnly ? 'critical' : 'all'}
                exclusive
                onChange={(_, value) => {
                  setFilters(prev => ({
                    ...prev,
                    criticalHoursOnly: value === 'critical'
                  }));
                }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: '#9CA3AF',
                    borderColor: '#444',
                    '&.Mui-selected': {
                      backgroundColor: '#8B5CF6',
                      color: 'white'
                    }
                  }
                }}
              >
                <ToggleButton value="all">All Hours</ToggleButton>
                <ToggleButton value="critical">1-3 AM Only</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

// Helper functions
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-green-500/20 text-green-400 border-green-500/30';
  }
};

const formatTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

const PolicyBadge: React.FC<{ policy: string }> = ({ policy }) => (
  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs border border-red-500/30">
    {policy}
  </span>
);

/**
 * Alerts page component that displays user activities and policy breaches
 */
function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<UserActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const searchParams = useSearchParams();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100); // Default to 100 items per page
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Calculate pagination values
  const totalItems = filteredActivities.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // ML Alerts View Component (moved inside AlertsPage to access state)
  const MLAlertsView: React.FC<{ activities: UserActivity[] }> = ({ activities }) => {
    const [mlAlerts, setMlAlerts] = useState<MLAlertItem[]>([]);
    const [alertLoading, setAlertLoading] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<MLAlertItem | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Generate ML alerts from activities
    useEffect(() => {
      const generateAlerts = async () => {
        if (activities.length === 0) return;

        setAlertLoading(true);
        try {
          // Load existing alerts
          const existingAlerts = AlertsManager.getAlerts();
          
          // Filter for pending/reviewing alerts only
          const activeAlerts = existingAlerts.filter(alert => 
            alert.status === 'pending' || alert.status === 'reviewing'
          );

          // If no active alerts, try to generate from ML recommendations
          if (activeAlerts.length === 0) {
            // Import recommendation engine
            const { RecommendationEngine } = await import('../../ml/recommendationEngine');
            const engine = new RecommendationEngine({
              sensitivityLevel: 'medium',
              maxRecommendations: 10,
              confidenceThreshold: 0.6,
              useAnomalyDetection: true,
              criticalHours: [1, 2, 3, 22, 23],
              includeAllRecommendations: false,
              useAdvancedAnalysis: true
            });

            const recommendations = engine.generateRecommendations(activities);
            
            // Convert high-priority recommendations to alerts
            const highPriorityRecs = recommendations.filter(rec => 
              rec.severity === 'critical' || rec.severity === 'high'
            );

            const newAlerts = AlertsManager.processRecommendationsIntoAlerts(highPriorityRecs);
            setMlAlerts(newAlerts);
          } else {
            setMlAlerts(activeAlerts);
          }
        } catch (error) {
          console.error('Error generating ML alerts:', error);
        } finally {
          setAlertLoading(false);
        }
      };

      generateAlerts();
    }, [activities]);

    const handleOpenAlertDetails = (alert: MLAlertItem) => {
      setSelectedAlert(alert);
      setModalOpen(true);
    };

    const handleCloseModal = () => {
      setModalOpen(false);
      setSelectedAlert(null);
    };

    const handleMarkAsReviewing = (alertId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      AlertsManager.markAsReviewing(alertId);
      
      // Update local state
      setMlAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'reviewing' as const, assignedTo: 'current_manager' }
          : alert
      ));
    };

    const handleAssignToMe = (alertId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      AlertsManager.assignToMe(alertId, 'current_manager');
      
      // Update local state
      setMlAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, assignedTo: 'current_manager' }
          : alert
      ));
    };

    const handleActionSubmit = async (alertId: string, action: string, comments: string) => {
      AlertsManager.submitManagerAction(alertId, action, comments);
      
      // Update local state
      setMlAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              status: action === 'dismissed' ? 'dismissed' as const : 'resolved' as const,
              managerAction: {
                action,
                comments,
                timestamp: new Date().toISOString(),
                managerId: 'current_manager'
              }
            }
          : alert
      ));
    };

    if (alertLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <CircularProgress sx={{ color: '#8B5CF6' }} />
          <span className="ml-3 text-gray-400">Analyzing activities for threats...</span>
        </div>
      );
    }

    if (mlAlerts.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mb-6">
            <Security className="w-16 h-16 text-[#8B5CF6] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#EEE] mb-2">No Active Threats Detected</h3>
            <p className="text-gray-400 text-base leading-relaxed max-w-lg mx-auto">
              Our ML analysis hasn&apos;t detected any high-priority security threats requiring immediate attention. 
              All user activities appear to be within normal parameters.
            </p>
          </div>
          
          <a href="/ml" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6E5FFE] to-[#8B5CF6] text-white font-bold rounded-lg hover:from-[#5B4FEE] hover:to-[#7C4FE4] transition-all duration-200 shadow-lg">
            <Visibility className="w-5 h-5" />
            View All ML Insights
          </a>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {mlAlerts.map((alert) => (
          <div 
            key={alert.id}
            className="bg-[#232346] border border-[#444] rounded-lg p-4 hover:border-[#6E5FFE] transition-all cursor-pointer"
            onClick={() => handleOpenAlertDetails(alert)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-semibold">{alert.userEmail}</span>
                  <span className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    alert.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    alert.status === 'reviewing' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {alert.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-2 text-sm">
                  <span className="text-[#8B5CF6]">{alert.threatType}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">Confidence: {Math.round(alert.confidence * 100)}%</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">Risk Score: {alert.riskScore}</span>
                </div>
                <p className="text-gray-300 text-sm">{alert.description}</p>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-2">{formatTime(alert.detectionTime)}</div>
                <div className="flex gap-2 mb-3">
                  {alert.policiesBreached.slice(0, 2).map((policy, idx) => (
                    <PolicyBadge key={idx} policy={policy} />
                  ))}
                  {alert.policiesBreached.length > 2 && (
                    <span className="text-xs text-gray-400">+{alert.policiesBreached.length - 2} more</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {alert.status === 'pending' && (
                    <button
                      onClick={(e) => handleMarkAsReviewing(alert.id, e)}
                      className="px-3 py-1 bg-[#6E5FFE]/20 text-[#8B5CF6] rounded-lg hover:bg-[#6E5FFE]/30 text-sm transition-all"
                    >
                      Start Review
                    </button>
                  )}
                  {!alert.assignedTo && (
                    <button
                      onClick={(e) => handleAssignToMe(alert.id, e)}
                      className="px-3 py-1 bg-[#232346] text-gray-300 rounded-lg hover:bg-[#333] text-sm transition-all flex items-center gap-1"
                    >
                      <AssignmentInd className="w-4 h-4" />
                      Assign to Me
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Alert Details Modal */}
        {selectedAlert && (
          <AlertDetailsModal
            alert={selectedAlert}
            isOpen={modalOpen}
            onClose={handleCloseModal}
            onActionSubmit={handleActionSubmit}
          />
        )}
      </div>
    );
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const fetchActivities = async (
    startDate: Date,
    endDate: Date,
    minRiskScore: number,
    maxRiskScore: number
  ): Promise<UserActivity[]> => {
    console.log('Fetching activities with date range:', startDate, endDate);
    console.log('Risk score range:', minRiskScore, maxRiskScore);

    try {
      // Load activities from IndexedDB only
      const indexedDBActivities = await loadFromIndexedDB();
      if (indexedDBActivities.length > 0) {
        return filterActivities(indexedDBActivities, startDate, endDate, minRiskScore, maxRiskScore);
      }
      
      // No data found, return empty array
      console.log('No activities found in storage');
      return [];
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  };

  const filterActivities = (
    activities: UserActivity[],
    startDate: Date,
    endDate: Date,
    minRiskScore: number,
    maxRiskScore: number
  ): UserActivity[] => {
    console.log('Filtering activities:', {
      total: activities.length, 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString()
    });
    
    // TEMPORARY: Return all activities to bypass date filtering issues
    // Only filter by risk score for now
    return activities.filter(activity => {
      // Handle missing risk scores with a default value
      const activityRiskScore = typeof activity.riskScore === 'number' ? 
        activity.riskScore : 0;
      
      const isInRiskRange = activityRiskScore >= minRiskScore && activityRiskScore <= maxRiskScore;
      
      return isInRiskRange;
    });
  };

  // Load from IndexedDB function with better error handling
  const loadFromIndexedDB = useCallback(async (): Promise<UserActivity[]> => {
    return new Promise((resolve, _reject) => {
      try {
        const request = indexedDB.open('activityDatabase', 3); // Changed from 'ActivityDB' to 'activityDatabase' to match upload
        
        request.onerror = () => {
          console.error('Error opening IndexedDB:', request.error);
          resolve([]);
        };
        
        request.onblocked = () => {
          console.warn('IndexedDB request blocked');
          resolve([]);
        };
        
        request.onupgradeneeded = (event) => {
          console.log('IndexedDB upgrade needed, creating object store');
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create the same structure as the upload functionality
          if (!db.objectStoreNames.contains('activities')) {
            db.createObjectStore('activities', { keyPath: 'id' });
          }
          
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'id' });
          }
          
          if (!db.objectStoreNames.contains('individualActivities')) {
            const individualStore = db.createObjectStore('individualActivities', { keyPath: 'id' });
            individualStore.createIndex('riskScore', 'riskScore', { unique: false });
            individualStore.createIndex('date', 'date', { unique: false });
            individualStore.createIndex('username', 'username', { unique: false });
            individualStore.createIndex('integration', 'integration', { unique: false });
          }
          
          console.log('Created object stores with indexes');
        };
        
        request.onsuccess = async () => {
          const db = request.result;
          
          try {
            // First try to use the storage utility function
            try {
              const { getActivitiesFromIndexedDB } = await import('../../utils/storage');
              const activities = await getActivitiesFromIndexedDB();
              console.log(`Loaded ${activities.length} activities using storage utility`);
              db.close();
              resolve(activities);
              return;
            } catch (storageError) {
              console.warn('Storage utility failed, trying direct access:', storageError);
            }
            
            // Fallback to direct access
            if (!db.objectStoreNames.contains('individualActivities') && !db.objectStoreNames.contains('activities')) {
              console.log('No object stores found, returning empty array');
              db.close();
              resolve([]);
              return;
            }
            
            // Try individual activities first (more efficient)
            if (db.objectStoreNames.contains('individualActivities')) {
              const transaction = db.transaction(['individualActivities'], 'readonly');
              const store = transaction.objectStore('individualActivities');
              const individualRequest = store.getAll();
              
              individualRequest.onsuccess = () => {
                const activities = individualRequest.result || [];
                console.log(`Loaded ${activities.length} activities from individualActivities store`);
                db.close();
                resolve(activities);
              };
              
              individualRequest.onerror = () => {
                console.error('GetAll request error:', individualRequest.error);
                db.close();
                resolve([]);
              };
              
              return;
            }
            
            // Fallback to chunked activities if individual activities don't exist
            if (db.objectStoreNames.contains('activities')) {
              const transaction = db.transaction(['activities'], 'readonly');
              const store = transaction.objectStore('activities');
              const chunkedRequest = store.getAll();
              
              chunkedRequest.onsuccess = () => {
                const chunks = chunkedRequest.result || [];
                const allActivities: UserActivity[] = [];
                
                // Combine all chunks
                chunks.forEach(chunk => {
                  if (chunk.data && Array.isArray(chunk.data)) {
                    allActivities.push(...chunk.data);
                  }
                });
                
                console.log(`Loaded ${allActivities.length} activities from chunked storage`);
                db.close();
                resolve(allActivities);
              };
              
              chunkedRequest.onerror = () => {
                console.error('GetAll request error:', chunkedRequest.error);
                db.close();
                resolve([]);
              };
              
              return;
            }
            
            console.log('No suitable object stores found');
            db.close();
            resolve([]);
            
          } catch (transactionError) {
            console.error('Error creating transaction:', transactionError);
            db.close();
            resolve([]);
          }
        };
        
      } catch (error) {
        console.error('Error in loadFromIndexedDB:', error);
        resolve([]);
      }
    });
  }, []);

  // Reset to first page when filters change
  const handleFilterChange = useCallback((filtered: UserActivity[]) => {
    setFilteredActivities(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setIsLoadingPage(true);
      setCurrentPage(page);
      // Small delay to show loading state
      setTimeout(() => setIsLoadingPage(false), 100);
    }
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        // Create a date range that includes historical and future dates
        // Start date: 5 years ago
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        
        // End date: 5 years in the future (to include 2025 dates from the CSV)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 5);
        
        console.log('[Alert Page] Loading activities from extended date range:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
        
        let result: UserActivity[] = [];
        
        try {
          console.log('[Alert Page] Loading from IndexedDB...');
          const indexedDBActivities = await loadFromIndexedDB();
          if (indexedDBActivities && indexedDBActivities.length > 0) {
            result = indexedDBActivities;
            console.log(`[Alert Page] Successfully loaded ${result.length} activities from IndexedDB`);
          } else {
            console.log('[Alert Page] No data found in storage.');
            setError('No activity data found. Please upload data from the Upload page.');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('[Alert Page] Error loading from storage:', error);
          setError('Error accessing data storage. Please try uploading data again.');
          setLoading(false);
          return;
        }
        
        // Filter activities by date range and risk score
        const filteredActivities = filterActivities(result, startDate, endDate, 0, 3000);
        console.log(`[Alert Page] Filtered to ${filteredActivities.length} activities in date range`);
        
        // Debugging: log first activity if available
        if (filteredActivities && filteredActivities.length > 0) {
          console.log('[Alert Page] First activity sample:', JSON.stringify(filteredActivities[0]).substring(0, 200));
          const policiesSample = filteredActivities[0].policiesBreached ? 
            (typeof filteredActivities[0].policiesBreached === 'string' ? 
              String(filteredActivities[0].policiesBreached).substring(0, 100) : 
              JSON.stringify(filteredActivities[0].policiesBreached).substring(0, 100)
            ) : 'none';
          console.log('[Alert Page] Policies breached sample:', policiesSample);
        } else {
          console.warn('[Alert Page] No activities found after filtering');
          setError('No activities found that match the filtering criteria. Please upload more data.');
        }
        
        setActivities(filteredActivities);
        setFilteredActivities(filteredActivities); // Initialize filtered activities
        console.log(`[Alert Page] Set activities state with length: ${filteredActivities.length}`);
        setError(null);
      } catch (err) {
        console.error('[Alert Page] Error in activity loading effect:', err);
        setError('Error loading activities: ' + (err instanceof Error ? err.message : String(err)));
        setActivities([]);
        setFilteredActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
    
    // Listen for data upload events
    const handleDataUpload = (event: CustomEvent) => {
      console.log('[Alert Page] Detected new data upload, refreshing...', event.detail);
      loadActivities();
    };
    
    window.addEventListener('dataUploaded', handleDataUpload as EventListener);
    
    // Check URL for tab parameter
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 3) {
        setTab(tabIndex);
      }
    }
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('dataUploaded', handleDataUpload as EventListener);
    };
  }, [searchParams, loadFromIndexedDB]);

  // Handle refresh button click
  const handleRefresh = async () => {
    try {
      setLoading(true);
      // Create a date range that includes historical and future dates
      // Start date: 5 years ago
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);
      
      // End date: 5 years in the future (to include 2025 dates from the CSV)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 5);
      
      const result = await fetchActivities(startDate, endDate, 0, 3000);
      setActivities(result);
      setFilteredActivities(result);
      setError(null);
    } catch (err) {
      console.error('Error refreshing activities:', err);
      setError('Error loading activities: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for custom alerts data
  const customAlerts: UserActivity[] = [];

  return (
    <div className="min-h-screen bg-[#121324] px-6 py-10 font-['IBM_Plex_Sans',Inter,sans-serif] flex flex-col">
      <div className="w-full bg-[#121324] rounded-2xl border border-[#333] shadow-[0_2px_12px_rgba(110,95,254,0.10)] px-8 py-10 flex flex-col gap-8 mx-auto">
        <div className="flex items-center justify-between mb-8 w-full">
          <h1 className="text-[2rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Alerts</h1>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#6E5FFE] to-[#8F7BFF] text-white font-bold px-7 py-3 rounded-xl shadow-lg hover:from-[#7C6BFF] hover:to-[#A89CFF] hover:scale-105 transition-all duration-150"
          >
            <FaSyncAlt className="text-lg" />
            Refresh Alerts
          </button>
        </div>

        <div className="relative z-10 mb-8">
          <div className="backdrop-blur-md bg-[#1F2030]/70 border border-white/10 rounded-xl shadow-lg px-4 py-2 flex items-center w-fit mx-auto w-full">
            <Tabs
              value={tab}
              onChange={handleTabChange}
              aria-label="Alerts tabs"
              TabIndicatorProps={{
                style: {
                  height: 6,
                  borderRadius: 6,
                  background: 'linear-gradient(90deg, #8B5CF6 0%, #6E5FFE 100%)',
                  boxShadow: '0 2px 12px #8B5CF655',
                  transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                }
              }}
              sx={{
                minHeight: 0,
                width: '100%',
                '.MuiTabs-flexContainer': { gap: 2 },
                '.MuiTab-root': {
                  color: '#BBB',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  px: 3,
                  py: 1.5,
                  borderRadius: '8px',
                  minHeight: 0,
                  transition: 'color 0.2s, background 0.2s',
                  fontFamily: "'IBM Plex Sans', Inter, sans-serif",
                  '&.Mui-selected': {
                    color: '#EEE',
                    textShadow: '0 2px 12px #8B5CF655',
                    background: 'linear-gradient(90deg, #8B5CF6 0%, #6E5FFE 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  },
                  '&:hover': {
                    color: '#8B5CF6',
                    background: 'rgba(139,92,246,0.08)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #8B5CF6',
                    outlineOffset: '2px',
                  },
                },
              }}
            >
              <Tab label="Immediate review" />
              <Tab label="Custom alerts" />
              <Tab label="ALL ACTIVITY" />
              <Tab label="Closed" />
            </Tabs>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh] w-full">
            <CircularProgress sx={{ color: '#8B5CF6' }} />
          </div>
        ) : error ? (
          <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
            <p className="text-red-400 font-semibold">{error}</p>
            <p className="text-gray-400 mt-4">
              Please navigate to the Upload page to provide activity data for analysis.
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
            <p className="text-gray-400">
              No activity data available. Please navigate to the Upload page to provide data for analysis.
            </p>
          </div>
        ) : (
          <>
            {tab === 0 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
                <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>ML-Detected Security Threats</h2>
                
                <MLAlertsView activities={activities} />
              </div>
            )}
            {tab === 1 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
                <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Custom Alerts</h2>
                {customAlerts.length === 0 ? (
                  <p className="text-gray-400">No custom alerts yet. Alerts saved from the Custom Alerts page will appear here.</p>
                ) : (
                  <ActivityList activities={customAlerts} policyIcons={policyIcons} />
                )}
              </div>
            )}
            {tab === 2 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 h-[calc(100vh-280px)] flex flex-col w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>
                    All Activities 
                    <span className="text-sm text-[#8B5CF6] font-normal ml-2">
                      ({totalItems.toLocaleString()} total activities)
                    </span>
                  </h2>
                  
                  {/* Items per page selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Show:</span>
                    <Select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      size="small"
                      sx={{
                        color: '#EEE',
                        backgroundColor: '#1F2030',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8B5CF6' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8B5CF6' }
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            backgroundColor: '#1F2030',
                            border: '1px solid #444'
                          }
                        }
                      }}
                    >
                      <MenuItem value={50} sx={{ color: '#EEE' }}>50 items</MenuItem>
                      <MenuItem value={100} sx={{ color: '#EEE' }}>100 items</MenuItem>
                      <MenuItem value={250} sx={{ color: '#EEE' }}>250 items</MenuItem>
                      <MenuItem value={500} sx={{ color: '#EEE' }}>500 items</MenuItem>
                      <MenuItem value={1000} sx={{ color: '#EEE' }}>1000 items</MenuItem>
                    </Select>
                  </div>
                </div>
                
                {/* Advanced Filter Component */}
                <AdaptiveActivityFilter 
                  activities={activities}
                  onFilterChange={handleFilterChange}
                />
                
                {/* Pagination Info */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="text-sm text-gray-400">
                    Showing {startIndex + 1}-{endIndex} of {totalItems.toLocaleString()} activities
                    {totalPages > 1 && (
                      <span className="ml-2">
                        (Page {currentPage} of {totalPages})
                      </span>
                    )}
                  </div>
                  
                  {/* Quick page jump */}
                  {totalPages > 10 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Go to page:</span>
                      <TextField
                        type="number"
                        size="small"
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            goToPage(page);
                          }
                        }}
                        inputProps={{ min: 1, max: totalPages }}
                        sx={{
                          width: 80,
                          '& .MuiOutlinedInput-root': {
                            color: '#EEE',
                            backgroundColor: '#1F2030',
                            '& fieldset': { borderColor: '#444' }
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Button
                      onClick={goToFirstPage}
                      disabled={currentPage === 1 || isLoadingPage}
                      size="small"
                      sx={{ color: '#8B5CF6', minWidth: 'auto' }}
                    >
                      ⏮
                    </Button>
                    <Button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1 || isLoadingPage}
                      size="small"
                      sx={{ color: '#8B5CF6', minWidth: 'auto' }}
                    >
                      ⏪
                    </Button>
                    
                    {/* Page numbers */}
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 7;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            onClick={() => goToPage(i)}
                            disabled={isLoadingPage}
                            variant={currentPage === i ? 'contained' : 'outlined'}
                            size="small"
                            sx={{
                              minWidth: 'auto',
                              color: currentPage === i ? 'white' : '#8B5CF6',
                              backgroundColor: currentPage === i ? '#8B5CF6' : 'transparent',
                              borderColor: '#8B5CF6',
                              '&:hover': {
                                backgroundColor: currentPage === i ? '#A78BFA' : 'rgba(139, 92, 246, 0.08)'
                              }
                            }}
                          >
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
                    
                    <Button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages || isLoadingPage}
                      size="small"
                      sx={{ color: '#8B5CF6', minWidth: 'auto' }}
                    >
                      ⏩
                    </Button>
                    <Button
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages || isLoadingPage}
                      size="small"
                      sx={{ color: '#8B5CF6', minWidth: 'auto' }}
                    >
                      ⏭
                    </Button>
                  </div>
                )}
                
                {/* Activity List */}
                <div className="flex-1 overflow-hidden">
                  {isLoadingPage ? (
                    <div className="flex justify-center items-center h-full">
                      <CircularProgress sx={{ color: '#8B5CF6' }} />
                    </div>
                  ) : (
                  <FullHeightActivityList 
                      activities={activities.slice(startIndex, endIndex)} 
                    policyIcons={policyIcons}
                  />
                  )}
                </div>
                
                {/* Bottom pagination for convenience */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 px-2 border-t border-[#333] pt-4">
                    <div className="text-sm text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={goToPrevPage}
                        disabled={currentPage === 1 || isLoadingPage}
                        size="small"
                        sx={{ color: '#8B5CF6' }}
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages || isLoadingPage}
                        size="small"
                        sx={{ color: '#8B5CF6' }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === 3 && (
              <div className="bg-[#1F2030] rounded-lg border border-[#333] shadow-[0_2px_8px_rgba(110,95,254,0.08)] p-8 mb-8 w-full">
                <h2 className="text-[1.15rem] font-extrabold tracking-wide text-[#EEE] pl-4 border-l-4 border-[#6E5FFE] mb-6 uppercase" style={{ fontFamily: "'IBM Plex Sans', Inter, sans-serif", letterSpacing: '0.04em', textShadow: '0 1px 8px #6E5FFE22' }}>Closed Alerts</h2>
                <ActivityList 
                  activities={activities.filter(a => a.status === 'closed')} 
                  policyIcons={policyIcons}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
function AlertsPageWithSuspense() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121324] flex items-center justify-center">
        <CircularProgress />
      </div>
    }>
      <AlertsPage />
    </Suspense>
  );
}

export default AlertsPageWithSuspense;
