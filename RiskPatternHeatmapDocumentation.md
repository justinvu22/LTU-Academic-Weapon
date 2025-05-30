# Risk Pattern Heatmap: Technical Documentation

## Overview
The Risk Pattern Heatmap visualizes security activity patterns across multiple dimensions. It processes activity data to reveal risk concentrations, temporal patterns, and policy violations.

## Core Data Processing

### View Modes
- **Integration × Hour**: Shows activity distribution by integration type across 24 hours
- **User × Hour**: Shows top users' activity patterns across 24 hours
- **Activity × Day**: Visualizes activity types across days of the week
- **Department × Risk**: Maps departments against risk levels

### Data Extraction Logic

#### Activity Type Extraction
```javascript
const extractActivityType = (activity) => {
  // Direct property check
  if (activity.activityType || activity.activity) return activity.activityType || activity.activity;
  
  // Inference from integration + policy breaches
  if (activity.integration) {
    // Email patterns (external, personal, document, spreadsheet)
    if (activity.integration.includes('email') && activity.policiesBreached?.dataLeakage) {
      // Check for specific email patterns in policy breach data
    }
    
    // USB patterns (access, copy)
    if (activity.integration.includes('usb')) {
      // Check for specific USB operations
    }
    
    // Cloud patterns (upload, access)
    // Application patterns (export, download)
  }
  
  // Fallback to integration-based type
  return 'Unknown Activity';
}
```

#### Department Extraction Logic
```javascript
const extractDepartment = (activity) => {
  // 1. Direct property check - if CSV has department column
  if (activity.department) return activity.department;
  
  // 2. Email pattern extraction
  const user = activity.user || activity.username || activity.userId || '';
  if (user.includes('.')) {
    const nameParts = user.split('@')[0].split('.');
    
    // Finance department patterns
    if (['finance', 'accounting', 'treasury'].some(term => 
      nameParts.some(part => part.toLowerCase().includes(term)))) {
      return 'Finance';
    }
    
    // IT department patterns
    if (['it', 'tech', 'system', 'dev', 'security'].some(term => 
      nameParts.some(part => part.toLowerCase().includes(term)))) {
      return 'IT';
    }
    
    // HR department patterns
    if (['hr', 'human', 'talent', 'personnel'].some(term => 
      nameParts.some(part => part.toLowerCase().includes(term)))) {
      return 'HR';
    }
    
    // Add more department patterns as needed
  }
  
  // 3. Policy breach inference
  if (activity.policiesBreached) {
    const policies = typeof activity.policiesBreached === 'string' 
      ? JSON.parse(activity.policiesBreached) 
      : activity.policiesBreached;
    
    // Map specific policy types to departments
    if (policies.financial || policies.pci) return 'Finance';
    if (policies.phi) return 'Healthcare';
    if (policies.pii) return 'HR';
    if (policies.dataLeakage && policies.confidential) return 'Legal';
  }
  
  // 4. Integration-based fallback
  if (activity.integration) {
    if (activity.integration.includes('email')) return 'Communications';
    if (activity.integration.includes('cloud')) return 'IT';
    if (activity.integration.includes('usb')) return 'Operations';
    if (activity.integration.includes('application')) return 'Business';
  }
  
  // Default fallback
  return 'General';
}
```

### Risk Calculation
- **Risk Bucketing**: Categorizes risk scores into 5 levels (Minimal to Critical)
- **Cell Risk**: Calculated from avg and max risk of activities in the cell
- **Policy Breach Tracking**: Counts breaches per cell for enhanced visibility

## Visual Features

### Color Coding
- **Purple**: Weekend/1-3AM activity (context-dependent)
- **Red**: Critical risk activities (risk score ≥ 2000)
- **Orange**: High risk activities (risk score ≥ 1500)
- **Green**: Normal activity with intensity based on volume

### Baseline Comparison
The "Baseline" toggle switch enables statistical anomaly detection by comparing current activity data against historical patterns:

```javascript
// Baseline comparison toggle
<FormControl component="fieldset">
  <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <Typography variant="body2">Baseline</Typography>
    <Switch
      checked={showBaselineComparison}
      onChange={(e) => setShowBaselineComparison(e.target.checked)}
      size="small"
    />
  </Box>
</FormControl>

// Baseline metrics calculation
const baselineMetrics = useMemo(() => {
  const metrics = new Map<string, { avg: number; stdDev: number }>();
  
  historicalData.forEach((data, key) => {
    // Calculate average
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    
    // Calculate standard deviation
    const squaredDiffs = data.map(value => Math.pow(value - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    metrics.set(key, { avg, stdDev });
  });
  
  return metrics;
}, [historicalData]);

// Cell color with baseline comparison
const getCellColorWithBaseline = (cell) => {
  if (cell.count === 0) return '#1A1B2E';
  
  const cellKey = `${cell.integration}_${cell.hour}`;
  const metrics = baselineMetrics.get(cellKey);
  
  if (showBaselineComparison && metrics) {
    // Determine deviation from baseline
    const deviation = (cell.count - metrics.avg) / metrics.stdDev;
    
    // Color based on deviation
    if (deviation > 2) return '#DC2626'; // High positive deviation (red)
    if (deviation > 1) return '#F59E0B'; // Moderate positive deviation (orange)
    if (deviation < -2) return '#2563EB'; // High negative deviation (blue)
    if (deviation < -1) return '#3B82F6'; // Moderate negative deviation (lighter blue)
    return '#10B981'; // Normal range (green)
  }
  
  // Default coloring if baseline comparison is off
  return getCellColor(cell);
};
```

When enabled, this feature:
- **Changes color coding** to reflect statistical deviation from baseline:
  - **Red**: High above baseline (+2σ) - Activity significantly higher than normal
  - **Orange**: Above baseline (+1σ) - Activity moderately higher than normal
  - **Green**: Normal range - Activity within expected parameters
  - **Light Blue**: Below baseline (-1σ) - Activity moderately lower than normal
  - **Dark Blue**: Far below baseline (-2σ) - Activity significantly lower than normal
- **Calculates baseline metrics** (average and standard deviation) for each cell position based on 7-day historical data
- **Enhances tooltips** with baseline comparison data showing expected activity count and percentage deviation when anomalous
- **Helps security analysts** identify unusual patterns that might indicate suspicious activity, even when absolute numbers aren't extreme but represent significant deviations from established patterns

### Show Patterns Feature
The "Show Patterns" toggle switch activates the anomalous pattern overlay visualization:

```javascript
// Pattern overlay toggle switch
<FormControl component="fieldset">
  <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <Typography variant="caption">Show Patterns</Typography>
    <Switch
      checked={showPatternOverlay}
      onChange={(e) => setShowPatternOverlay(e.target.checked)}
      size="small"
    />
  </Box>
</FormControl>

// In the cell rendering logic
<Box
  sx={{
    // Other styles...
    border: (showPatternOverlay && cell.isAnomaly) ? '2px solid #DC2626' : 
           cell.isCriticalHour ? '1px solid #8B5CF6' : '1px solid #333',
    animation: (showPatternOverlay && cell.isAnomaly) ? 'pulse 2s infinite' : 'none'
  }}
/>
```

When enabled, this feature:
- Highlights anomalous cells with a red pulsing border
- Adds an additional legend item explaining the pattern marker
- Uses CSS animation to draw attention to concerning patterns
- Helps security analysts quickly identify suspicious activity clusters

### Anomalous Pattern Detection
The component uses a multi-factor algorithm to identify suspicious patterns. A cell is flagged as anomalous when:

```javascript
// Anomaly detection logic
isAnomaly: data && data.count > 0 && (
  // Factor 1: High risk score
  (data.maxRisk > 2000) || 
  
  // Factor 2: Suspicious timing with high volume
  (viewMode === 'integration_hour' || viewMode === 'user_hour') ? 
    ([1, 2, 3].includes(hour) && data.count > 5) :
  
  // Factor 3: Weekend high volume (for day view)
  viewMode === 'activity_day' ? 
    ((day === 0 || day === 6) && data.count > 10) :
  
  // Factor 4: Department with many high/critical risk activities  
  (viewMode === 'department_risk' && riskBucket >= 3 && data.count > 5)
)
```

This multi-factor approach identifies:
1. **Very high risk activities** regardless of timing or volume
2. **After-hours suspicious activity** (1-3 AM) with unusual volume
3. **Weekend unusual activity patterns** with high volume
4. **Departmental risk concentrations** with multiple high/critical activities

## Additional Features
- **Policy Breach Filter**: Dedicated button to view all policy violations
- **Pattern Overlay**: Visual highlighting of suspicious patterns
- **Responsive Layout**: Adapts to different screen sizes

## Implementation Notes
- Uses React's useCallback and useMemo for optimized performance
- Reactive data processing avoids unnecessary recalculations
- Custom tooltips provide context-sensitive information 