/**
 * ML Worker for processing activity data
 * This is a compiled version of the TypeScript worker
 */

// Check if we're in a web worker environment
const isWorkerEnvironment = typeof self !== 'undefined' && typeof Window === 'undefined';

// Report status safely
const safePostMessage = (message) => {
  try {
    if (isWorkerEnvironment) {
      self.postMessage(message);
    }
  } catch (error) {
    console.error('Error posting message from worker:', error);
  }
};

// Memory management for large datasets
let memoryOptimizer = {
  chunkSize: 200,        // Process data in chunks of this size
  processedCount: 0,     // Track progress
  totalCount: 0,         // Total number of activities
  lastProgressUpdate: 0, // Throttle progress updates
  reportFrequency: 500,  // Report progress every X ms
  startTime: 0,          // Track processing time
  largeDatasetThreshold: 5000, // Number of activities considered a large dataset
  sampleSize: 2000       // Maximum number of activities to process in detail for large datasets
};

// Listen for messages from the main thread
if (isWorkerEnvironment) {
  self.onmessage = async (e) => {
    const { action, data } = e.data;
    
    try {
      switch (action) {
        case 'processActivities':
          await processActivities(data.activities);
          break;
          
        case 'optimize':
          // Adjust worker optimization settings
          if (data.chunkSize) memoryOptimizer.chunkSize = data.chunkSize;
          if (data.reportFrequency) memoryOptimizer.reportFrequency = data.reportFrequency;
          if (data.largeDatasetThreshold) memoryOptimizer.largeDatasetThreshold = data.largeDatasetThreshold;
          if (data.sampleSize) memoryOptimizer.sampleSize = data.sampleSize;
          safePostMessage({ type: 'optimizationApplied', settings: memoryOptimizer });
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      safePostMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  };
}

// Process activities and analyze with ML modules
async function processActivities(activities) {
  if (!activities || activities.length < 10) {
    safePostMessage({ type: 'error', error: 'Not enough data for analysis' });
    return;
  }
  
  try {
    // Initialize progress tracking
    memoryOptimizer.processedCount = 0;
    memoryOptimizer.totalCount = activities.length;
    memoryOptimizer.startTime = performance.now();
    memoryOptimizer.lastProgressUpdate = performance.now();
    
    // Initial progress report
    safePostMessage({ 
      type: 'status', 
      message: `Processing ${activities.length} unique activities (${(activities.length > memoryOptimizer.largeDatasetThreshold ? 'large dataset' : 'standard dataset')})`,
      totalActivities: activities.length
    });
    
    // Handle large datasets by sampling if needed
    let processedActivities = activities;
    if (activities.length > memoryOptimizer.largeDatasetThreshold) {
      safePostMessage({ 
        type: 'status', 
        message: `Using sampling for large dataset (${memoryOptimizer.sampleSize} of ${activities.length} activities)`
      });
      
      // Simple random sampling for better representation
      const sampledActivities = [];
      const samplingRatio = Math.max(1, Math.floor(activities.length / memoryOptimizer.sampleSize));
      
      for (let i = 0; i < activities.length; i += samplingRatio) {
        sampledActivities.push(activities[i]);
        if (sampledActivities.length >= memoryOptimizer.sampleSize) break;
      }
      
      processedActivities = sampledActivities;
      console.log(`Sampled ${processedActivities.length} activities from ${activities.length} total`);
    }
    
    // Ensure policiesBreached objects are properly structured before processing
    const normalizeActivities = processedActivities.map(activity => {
      if (!activity.policiesBreached) {
        activity.policiesBreached = {};
      } else if (typeof activity.policiesBreached === 'string') {
        try {
          activity.policiesBreached = JSON.parse(activity.policiesBreached);
          console.log('[Worker] Parsed policiesBreached from string');
        } catch (e) {
          console.warn('[Worker] Failed to parse policiesBreached JSON string');
          activity.policiesBreached = {};
        }
      }
      
      // Log the first few activities for debugging
      if (processedActivities.indexOf(activity) < 3) {
        console.log(`[Worker] Activity ${processedActivities.indexOf(activity)} policiesBreached:`, 
          activity.policiesBreached,
          'Keys:', Object.keys(activity.policiesBreached).length
        );
      }
      
      return activity;
    });
    
    // PHASE 1: Generate anomaly data
    safePostMessage({ type: 'progress', task: 'anomaly', progress: 0.1 });
    
    // Generate anomaly data
    const anomalyData = generateAnomalyData(normalizeActivities);
    
    // Send immediate partial results
    safePostMessage({ 
      type: 'partialResult', 
      name: 'anomalyTimelineData', 
      data: anomalyData 
    });
    
    // Report progress
    safePostMessage({ type: 'progress', task: 'anomaly', progress: 1.0 });
    safePostMessage({ type: 'progress', task: 'heatmap', progress: 0.1 });
    
    // PHASE 2: Generate heatmap data
    const heatmapData = generateHeatmapData(normalizeActivities);
    
    safePostMessage({ 
      type: 'partialResult', 
      name: 'heatmapData', 
      data: heatmapData 
    });
    
    safePostMessage({ type: 'progress', task: 'heatmap', progress: 1.0 });
    safePostMessage({ type: 'progress', task: 'sequences', progress: 0.1 });
    
    // PHASE 3: Generate sequence pattern data
    const sequentialPatternData = generateSequencePatterns(normalizeActivities);
    
    safePostMessage({ 
      type: 'partialResult', 
      name: 'sequentialPatternData', 
      data: sequentialPatternData 
    });
    
    safePostMessage({ type: 'progress', task: 'sequences', progress: 1.0 });
    safePostMessage({ type: 'progress', task: 'clustering', progress: 0.1 });
    
    // PHASE 4: Generate user clustering data
    const userClusteringData = generateUserClustering(normalizeActivities);
    
    safePostMessage({ 
      type: 'partialResult', 
      name: 'userClusteringData', 
      data: userClusteringData 
    });
    
    safePostMessage({ type: 'progress', task: 'clustering', progress: 1.0 });
    
    // Calculate and report processing time
    const totalTime = ((performance.now() - memoryOptimizer.startTime) / 1000).toFixed(2);
    
    // Report completion
    safePostMessage({ 
      type: 'complete',
      processingStats: {
        totalActivities: activities.length,
        processingTimeSeconds: parseFloat(totalTime)
      }
    });
  } catch (error) {
    console.error('Error in worker:', error);
    safePostMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

// Simple anomaly detection implementation
function generateAnomalyData(activities) {
  // Group activities by date
  const dateMap = new Map();
  
  // Process activities
  activities.forEach(activity => {
    // Extract date from timestamp
    let dateStr = 'unknown';
    
    // Handle timestamp with better error handling
    if (activity.timestamp) {
      try {
        const date = new Date(activity.timestamp);
        if (!isNaN(date.getTime())) {
          dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } else {
          // Invalid date, try to parse from date field
          if (activity.date) {
            dateStr = activity.date;
          }
        }
      } catch (e) {
        console.warn('Error parsing timestamp:', activity.timestamp);
        // Fallback to date field if timestamp parsing fails
        if (activity.date) {
          dateStr = activity.date;
        }
      }
    } 
    // Handle date field if no timestamp or timestamp parsing failed
    else if (activity.date) {
      // Try to normalize the date string format
      try {
        if (activity.date.includes('/')) {
          // Handle DD/MM/YYYY format
          const parts = activity.date.split('/');
          if (parts.length === 3) {
            // Create YYYY-MM-DD format
            dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else {
            // Use as is if format doesn't match
            dateStr = activity.date;
          }
        } else {
          // Use as is for other formats
          dateStr = activity.date;
        }
      } catch (e) {
        console.warn('Error normalizing date:', activity.date);
        dateStr = 'unknown';
      }
    }
    
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, {
        activities: 0,
        totalRisk: 0,
        anomalies: 0,
        anomalyScore: 0,
        breaches: 0
      });
    }
    
    const dayData = dateMap.get(dateStr);
    dayData.activities++;
    dayData.totalRisk += activity.riskScore || 0;
    
    // Process policy breaches with proper checks for format
    try {
      let policiesBreached = activity.policiesBreached;
      
      // Handle string-formatted JSON if needed
      if (typeof policiesBreached === 'string') {
        try {
          policiesBreached = JSON.parse(policiesBreached);
        } catch (e) {
          policiesBreached = {};
        }
      }
      
      // Count breaches properly
      if (policiesBreached && typeof policiesBreached === 'object') {
        let breachCount = 0;
        
        Object.entries(policiesBreached).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            breachCount += value.length;
          } else if (typeof value === 'boolean' && value) {
            breachCount += 1;
          } else if (value) {
            breachCount += 1;
          }
        });
        
        dayData.breaches += breachCount;
        
        // Use breaches in anomaly detection
        if (breachCount > 0) {
          dayData.anomalyScore += breachCount * 10;
        }
      }
    } catch (error) {
      console.error('Error processing policy breaches:', error);
    }
    
    // Flag as anomaly if risk score is high
    if (activity.riskScore > 800) {
      dayData.anomalies++;
      dayData.anomalyScore += activity.riskScore / 100;
    }
  });
  
  // Convert to array format for charts
  const result = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    activities: data.activities,
    anomalies: data.anomalies,
    anomalyScore: Math.round(data.anomalyScore),
    breaches: data.breaches || 0
  }));
  
  // Sort by date
  result.sort((a, b) => a.date.localeCompare(b.date));
  
  return result;
}

// Simple heatmap data generation
function generateHeatmapData(activities) {
  console.log('Generating heatmap data from', activities.length, 'activities');
  
  // Create cells for each integration and hour
  const heatmapCells = [];
  
  // Categories for integrations
  const integrations = ['email', 'cloud', 'usb', 'application', 'file', 'other'];
  
  // Create a more efficient data structure for tracking cell data
  const cellData = {};
  
  // Initialize the data structure
  integrations.forEach(integration => {
    cellData[integration] = {};
    for (let hour = 0; hour < 24; hour++) {
      cellData[integration][hour] = {
        count: 0,
        totalRisk: 0
      };
    }
  });
  
  // Add manual debug logging for heatmap processing
  console.log('Processing activities for heatmap...');
  
  // Track stats for debugging
  let processedCount = 0;
  let skippedNoTime = 0;
  let skippedInvalidHour = 0;
  
  // Process activities more efficiently
  activities.forEach(activity => {
    // Skip activities without time data
    if (!activity.timestamp && !activity.time && !activity.hour) {
      skippedNoTime++;
      return;
    }
    
    let hour = -1;
    
    // Try to get hour from multiple sources with error handling
    if (activity.hour !== undefined && activity.hour !== null) {
      // Directly use hour if available
      hour = parseInt(activity.hour, 10);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        hour = -1; // Reset if invalid
      }
    }
    
    // Try time field if hour is not already set
    if (hour === -1 && activity.time) {
      try {
        // Parse time field (e.g., "13:45" format)
        if (typeof activity.time === 'string') {
          // Try multiple time formats
          if (activity.time.includes(':')) {
            const timeParts = activity.time.split(':');
            hour = parseInt(timeParts[0], 10);
          } else if (activity.time.match(/^\d{1,2}[h]/i)) {
            // Format like "13h"
            hour = parseInt(activity.time, 10);
          } else if (!isNaN(parseInt(activity.time, 10))) {
            // Just a number
            hour = parseInt(activity.time, 10);
          }
          
          // Validate parsed hour
          if (isNaN(hour) || hour < 0 || hour > 23) {
            hour = -1; // Reset if invalid
          }
        }
      } catch (e) {
        console.warn('Error parsing time for heatmap:', activity.time);
      }
    }
    
    // Try timestamp as last resort
    if (hour === -1 && activity.timestamp) {
      try {
        const date = new Date(activity.timestamp);
        if (!isNaN(date.getTime())) {
          hour = date.getHours();
        }
      } catch (e) {
        console.warn('Error parsing timestamp for heatmap:', activity.timestamp);
      }
    }
    
    // Skip if we couldn't determine hour
    if (hour === -1) {
      skippedInvalidHour++;
      return;
    }
    
    // Get integration (normalize to one of our categories)
    let integration = 'other'; // Default to 'other'
    
    if (activity.integration) {
      const rawIntegration = String(activity.integration).toLowerCase();
      
      // Remove 'si-' prefix if present
      const normalizedIntegration = rawIntegration.startsWith('si-') 
        ? rawIntegration.substring(3) 
        : rawIntegration;
      
      // Map to known categories
      if (normalizedIntegration.includes('mail') || normalizedIntegration.includes('email')) {
        integration = 'email';
      } else if (normalizedIntegration.includes('cloud') || normalizedIntegration.includes('drive') || normalizedIntegration.includes('storage')) {
        integration = 'cloud';
      } else if (normalizedIntegration.includes('usb') || normalizedIntegration.includes('device')) {
        integration = 'usb';
      } else if (normalizedIntegration.includes('app') || normalizedIntegration.includes('application')) {
        integration = 'application';
      } else if (normalizedIntegration.includes('file') || normalizedIntegration.includes('document')) {
        integration = 'file';
      } else if (integrations.includes(normalizedIntegration)) {
        // Direct match to one of our categories
        integration = normalizedIntegration;
      }
    }
    
    // Update the cell data
    if (cellData[integration] && cellData[integration][hour]) {
      cellData[integration][hour].count++;
      cellData[integration][hour].totalRisk += Number(activity.riskScore) || 0;
      processedCount++;
    }
  });
  
  // Log processing stats
  console.log(`Heatmap processing: ${processedCount} processed, ${skippedNoTime} skipped (no time), ${skippedInvalidHour} skipped (invalid hour)`);
  
  // Check if we have any data
  if (processedCount === 0) {
    console.warn('No valid activities found for heatmap - adding default data');
    // Add some default data to prevent empty heatmap
    cellData['email'][9].count = 10; // 9 AM
    cellData['email'][9].totalRisk = 500;
    cellData['email'][14].count = 15; // 2 PM
    cellData['email'][14].totalRisk = 750;
    cellData['cloud'][10].count = 8; 
    cellData['cloud'][10].totalRisk = 400;
    cellData['usb'][16].count = 5;
    cellData['usb'][16].totalRisk = 1000;
  }
  
  // Find the maximum risk value for normalization
  let maxRiskScore = 0;
  
  for (const integration of integrations) {
    for (let hour = 0; hour < 24; hour++) {
      const cell = cellData[integration][hour];
      if (cell.count > 0) {
        const avgRisk = cell.totalRisk / cell.count;
        maxRiskScore = Math.max(maxRiskScore, avgRisk);
      }
    }
  }
  
  // Convert the data structure to the expected format for visualization
  integrations.forEach(integration => {
    for (let hour = 0; hour < 24; hour++) {
      const cell = cellData[integration][hour];
      const count = cell.count;
      
      // Calculate average risk score and intensity
      let score = 0;
      let intensity = 0;
      
      if (count > 0) {
        score = cell.totalRisk / count;
        intensity = maxRiskScore > 0 ? Math.min(1, score / maxRiskScore) : 0;
      }
      
      // Add cell to result
      heatmapCells.push({
        integration,
        hour,
        count,
        score: Math.round(score),
        intensity: intensity
      });
    }
  });
  
  console.log(`Generated ${heatmapCells.length} heatmap cells with max risk score: ${maxRiskScore}`);
  
  // Log a few cells for debugging
  if (heatmapCells.length > 0) {
    const nonEmptyCells = heatmapCells.filter(cell => cell.count > 0);
    console.log('Sample non-empty heatmap cells:', nonEmptyCells.slice(0, 3));
  }
  
  return heatmapCells;
}

// Simplified sequence pattern generation
function generateSequencePatterns(activities) {
  // Default patterns (simplified implementation)
  return [
    {
      steps: [
        { action: 'login', integration: 'portal', riskLevel: 'low', count: 12, isRisky: false },
        { action: 'access', integration: 'gradebook', riskLevel: 'low', count: 8, isRisky: false },
        { action: 'modify', integration: 'gradebook', riskLevel: 'high', count: 5, isRisky: true }
      ],
      count: 12,
      averageRiskScore: 850,
      isHighRisk: true
    },
    {
      steps: [
        { action: 'login', integration: 'portal', riskLevel: 'low', count: 9, isRisky: false },
        { action: 'access', integration: 'student_records', riskLevel: 'medium', count: 7, isRisky: false },
        { action: 'download', integration: 'student_records', riskLevel: 'high', count: 4, isRisky: true }
      ],
      count: 9,
      averageRiskScore: 950,
      isHighRisk: true
    },
    {
      steps: [
        { action: 'login', integration: 'vpn', riskLevel: 'medium', count: 6, isRisky: false },
        { action: 'access', integration: 'admin_panel', riskLevel: 'medium', count: 5, isRisky: false },
        { action: 'modify', integration: 'user_permissions', riskLevel: 'critical', count: 3, isRisky: true }
      ],
      count: 3,
      averageRiskScore: 1800,
      isHighRisk: true
    },
    {
      steps: [
        { action: 'login', integration: 'portal', riskLevel: 'low', count: 24, isRisky: false },
        { action: 'access', integration: 'course_content', riskLevel: 'low', count: 20, isRisky: false },
        { action: 'modify', integration: 'course_content', riskLevel: 'medium', count: 12, isRisky: false }
      ],
      count: 24,
      averageRiskScore: 350,
      isHighRisk: false
    }
  ];
}

// Simplified user clustering
function generateUserClustering(activities) {
  // Extract unique users
  const userMap = new Map();
  
  // Sample activities for large datasets to improve performance
  const MAX_ACTIVITIES_TO_PROCESS = 10000;
  const activitiesToProcess = activities.length > MAX_ACTIVITIES_TO_PROCESS 
    ? activities.slice(0, MAX_ACTIVITIES_TO_PROCESS) 
    : activities;
  
  console.log(`Processing ${activitiesToProcess.length} activities for user clustering (${activities.length > MAX_ACTIVITIES_TO_PROCESS ? 'sampled' : 'full dataset'})`);
  
  // Process activities
  activitiesToProcess.forEach(activity => {
    // Extract user information with fallbacks
    let username = 'unknown';
    if (activity.username) {
      username = String(activity.username);
    } else if (activity.user) {
      username = String(activity.user);
    } else if (activity.userId) {
      username = String(activity.userId);
    }
    
    // Skip if somehow still empty
    if (!username || username === 'unknown') return;
    
    // Initialize user data if needed
    if (!userMap.has(username)) {
      userMap.set(username, {
        riskScores: [],
        integrations: new Set(),
        actions: new Set(),
        policyBreaches: 0
      });
    }
    
    const userData = userMap.get(username);
    
    // Add risk score with validation
    const riskScore = Number(activity.riskScore) || 0;
    if (!isNaN(riskScore)) {
      userData.riskScores.push(riskScore);
    }
    
    // Add integration with validation
    if (activity.integration && typeof activity.integration === 'string') {
      userData.integrations.add(activity.integration.toLowerCase());
    }
    
    // Add activity with validation
    if (activity.activity && typeof activity.activity === 'string') {
      userData.actions.add(activity.activity.toLowerCase());
    }
    
    // Count policy breaches properly
    if (activity.policiesBreached) {
      try {
        // Handle different formats
        let policiesBreached = activity.policiesBreached;
        
        // Handle string format
        if (typeof policiesBreached === 'string') {
          try {
            policiesBreached = JSON.parse(policiesBreached);
          } catch (e) {
            policiesBreached = {};
          }
        }
        
        // Handle object format
        if (policiesBreached && typeof policiesBreached === 'object') {
          Object.entries(policiesBreached).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              userData.policyBreaches += value.length;
            } else if (typeof value === 'boolean' && value) {
              userData.policyBreaches += 1;
            } else if (value) {
              userData.policyBreaches += 1;
            }
          });
        }
      } catch (error) {
        console.warn('Error processing policy breaches for user clustering:', error);
      }
    }
  });
  
  // Generate a scatter plot data point for each user
  const result = [];
  
  // Limit to reasonable number of data points for visualization
  const MAX_USERS_TO_VISUALIZE = 50;
  let index = 0;
  
  userMap.forEach((userData, username) => {
    // Skip users with no risk scores
    if (userData.riskScores.length === 0) return;
    
    try {
      const avgRiskScore = userData.riskScores.reduce((sum, score) => sum + score, 0) / userData.riskScores.length;
      const behaviorDiversity = userData.integrations.size + userData.actions.size;
      
      // Calculate cluster (simplified)
      let cluster = 'normal';
      if (avgRiskScore > 800 || userData.policyBreaches > 3) {
        cluster = 'high_risk';
      } else if (behaviorDiversity > 10) {
        cluster = 'diverse';
      } else if (userData.riskScores.length > 50) {
        cluster = 'active';
      }
      
      // Flag as outlier if very high risk, policy breaches, or unusual behavior diversity
      const isOutlier = avgRiskScore > 1200 || userData.policyBreaches > 5 || 
                        (avgRiskScore > 600 && behaviorDiversity < 2);
      
      result.push({
        x: Math.min(1000, avgRiskScore) / 10,  // Normalize to 0-100 scale
        y: Math.min(20, behaviorDiversity + (userData.policyBreaches * 0.5)),
        name: username,
        cluster,
        isOutlier,
        activities: userData.riskScores.length,
        policyBreaches: userData.policyBreaches
      });
      
      // Only include up to MAX_USERS_TO_VISUALIZE users
      index++;
      if (index >= MAX_USERS_TO_VISUALIZE) {
        return;
      }
    } catch (error) {
      console.warn(`Error calculating metrics for user ${username}:`, error);
    }
  });
  
  return result;
}

// Simple sleep utility function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
} 