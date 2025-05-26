// Web Worker for ML Processing
// This allows ML operations to run in a separate thread

// Import types from common locations
import { UserActivity } from '../types/activity';

// Check if we're in a web worker environment
const isWorkerEnvironment = typeof self !== 'undefined' && typeof Window === 'undefined';

// Memory and performance configuration
interface MemoryOptimizer {
  chunkSize: number;
  processedCount: number;
  totalCount: number;
  lastProgressUpdate: number;
  reportFrequency: number;
  startTime: number;
  stringCache: Map<string, string>;
}

// Report status safely
const safePostMessage = (message: any) => {
  try {
    if (isWorkerEnvironment) {
      self.postMessage(message);
    }
  } catch (error) {
    console.error('Error posting message from worker:', error);
  }
};

// Memory management for large datasets
const memoryOptimizer: MemoryOptimizer = {
  chunkSize: 500,        // Process in chunks of 500 for better performance
  processedCount: 0,     // Track progress
  totalCount: 0,         // Total number of activities
  lastProgressUpdate: 0, // Throttle progress updates
  reportFrequency: 500,  // Report progress every X ms
  startTime: 0,          // Track processing time
  stringCache: new Map() // Cache for string deduplication
};

// Cleanup memory when needed
const cleanupMemory = () => {
  memoryOptimizer.stringCache.clear();
  
  // Force garbage collection if available
  if (typeof global !== 'undefined' && 'gc' in global) {
    (global as any).gc();
  }
  
  safePostMessage({ type: 'status', message: 'Memory cleaned up' });
};

// Optimize memory usage by deduplicating strings
function optimizeStrings<T extends Record<string, any>>(obj: T): T {
  if (!obj) return obj;
  
  const result = { ...obj } as any;
  
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 10) {
      // Deduplicate the string if it's already in cache
      if (memoryOptimizer.stringCache.has(value)) {
        result[key] = memoryOptimizer.stringCache.get(value);
      } else {
        memoryOptimizer.stringCache.set(value, value);
        result[key] = value;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively optimize nested objects
      result[key] = optimizeStrings(value);
    }
  });
  
  return result as T;
}

// Process activities in chunks to avoid memory issues
async function processInChunks<T>(
  activities: UserActivity[],
  processingFunction: (activities: UserActivity[], isPartial?: boolean) => Promise<T>,
  taskName: string,
  customChunkSize?: number
): Promise<T> {
  const chunkSize = customChunkSize || memoryOptimizer.chunkSize;
  const totalChunks = Math.ceil(activities.length / chunkSize);
  
  // For functions that need the entire dataset, we can't chunk
  // Check if the function accepts a second parameter for partial processing
  const canProcessPartially = processingFunction.length > 1;
  
  if (!canProcessPartially) {
    // If we can't process partially, just process everything
    return await processingFunction(activities);
  }
  
  // Initialize result storage based on first chunk result type
  let combinedResult: any = null;
  
  // Process each chunk
  for (let i = 0; i < activities.length; i += chunkSize) {
    // Extract current chunk
    const chunk = activities.slice(i, i + chunkSize);
    
    // Process this chunk
    const chunkResult = await processingFunction(chunk, true);
    
    // Initialize combined result structure based on first result
    if (i === 0) {
      combinedResult = chunkResult;
    } else {
      // Merge results based on type
      if (Array.isArray(chunkResult) && Array.isArray(combinedResult)) {
        combinedResult.push(...chunkResult);
      } else if (typeof chunkResult === 'object' && typeof combinedResult === 'object') {
        // Merge object properties
        combinedResult = { ...combinedResult, ...chunkResult };
      }
    }
    
    // Update progress
    memoryOptimizer.processedCount += chunk.length;
    
    // Report progress (throttled)
    const now = performance.now();
    if (now - memoryOptimizer.lastProgressUpdate > memoryOptimizer.reportFrequency) {
      const progressPercent = Math.min(0.99, memoryOptimizer.processedCount / memoryOptimizer.totalCount);
      safePostMessage({ 
        type: 'progress', 
        task: taskName, 
        progress: progressPercent,
        chunkProgress: {
          current: Math.floor(i / chunkSize) + 1,
          total: totalChunks
        }
      });
      memoryOptimizer.lastProgressUpdate = now;
    }
    
    // Yield to the event loop to keep the worker responsive
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return combinedResult as T;
}

// Process activities and analyze with ML modules
async function processActivities(activities: UserActivity[]) {
  if (!activities || activities.length < 10) {
    safePostMessage({ type: 'error', error: 'Not enough data for analysis (minimum 10 activities required)' });
    return;
  }
  
  try {
    // Initialize progress tracking and memory optimization
    memoryOptimizer.processedCount = 0;
    memoryOptimizer.totalCount = activities.length;
    memoryOptimizer.startTime = performance.now();
    memoryOptimizer.lastProgressUpdate = performance.now();
    memoryOptimizer.stringCache.clear(); // Clear cache before starting
    
    // Initial progress report
    safePostMessage({ 
      type: 'status', 
      message: `Starting ML processing of ${activities.length} activities`,
      totalActivities: activities.length
    });
    
    // Create a memory-efficient view of the activities
    const normalizeActivities = activities.map(activity => {
      // First optimize strings to reduce memory usage
      const optimizedActivity = optimizeStrings(activity);
      
      // Normalize policiesBreached to ensure consistent format
      if (!optimizedActivity.policiesBreached) {
        optimizedActivity.policiesBreached = {};
      } else if (typeof optimizedActivity.policiesBreached === 'string') {
        try {
          optimizedActivity.policiesBreached = JSON.parse(optimizedActivity.policiesBreached);
        } catch (e) {
          optimizedActivity.policiesBreached = {};
    }
      }
      
      return optimizedActivity;
    });
    
    // PHASE 1: Anomaly Detection
    safePostMessage({ type: 'progress', task: 'anomaly', progress: 0.1 });
    safePostMessage({ type: 'status', message: 'Detecting anomalies in activity patterns...' });
    
    let anomalyData: any[] = [];
    try {
      const { generateAnomalyTimelineData } = await import('../utils/ml/anomalyDetection');
      anomalyData = await processInChunks(
        normalizeActivities, 
        generateAnomalyTimelineData,
        'anomaly'
      );
    } catch (anomalyError) {
      console.error('Error in anomaly detection:', anomalyError);
      safePostMessage({ 
        type: 'error', 
        error: `Anomaly detection error: ${anomalyError instanceof Error ? anomalyError.message : String(anomalyError)}`
      });
    }
    
    // Send immediate partial results
    safePostMessage({ 
      type: 'partialResult', 
      name: 'anomalyTimelineData', 
      data: anomalyData 
    });
    
    // Report progress
    safePostMessage({ type: 'progress', task: 'anomaly', progress: 1.0 });
    safePostMessage({ type: 'progress', task: 'heatmap', progress: 0.1 });
    safePostMessage({ type: 'status', message: 'Generating heatmap visualization data...' });
    
    // PHASE 2: Process heatmap data
    let heatmapData: any[] = [];
    try {
      const { generateHeatmapData } = await import('../utils/ml/heatmapAnalysis');
      heatmapData = await processInChunks(
        normalizeActivities, 
        generateHeatmapData,
        'heatmap'
      );
    } catch (heatmapError) {
      console.error('Error in heatmap generation:', heatmapError);
    }
    
    safePostMessage({ 
      type: 'partialResult', 
      name: 'heatmapData', 
      data: heatmapData 
    });
    
    safePostMessage({ type: 'progress', task: 'heatmap', progress: 1.0 });
    safePostMessage({ type: 'progress', task: 'sequences', progress: 0.1 });
    safePostMessage({ type: 'status', message: 'Analyzing sequential activity patterns...' });
    
    // PHASE 3: Process sequence patterns
    let sequentialPatternData: any[] = [];
    try {
      const { generateSequentialPatternData } = await import('../utils/ml/sequencePatterns');
      
        // Sequence patterns are more complex, so we use smaller chunks
        const smallerChunkSize = Math.floor(memoryOptimizer.chunkSize / 2);
        sequentialPatternData = await processInChunks(
        normalizeActivities, 
          generateSequentialPatternData, 
          'sequences',
          smallerChunkSize
        );
    } catch (sequenceError) {
      console.error('Error in sequence pattern analysis:', sequenceError);
    }
    
    safePostMessage({ 
      type: 'partialResult', 
      name: 'sequentialPatternData', 
      data: sequentialPatternData 
    });
    
    safePostMessage({ type: 'progress', task: 'sequences', progress: 1.0 });
    safePostMessage({ type: 'progress', task: 'clustering', progress: 0.1 });
    safePostMessage({ type: 'status', message: 'Clustering users by behavior patterns...' });
    
    // Free up memory from previous results
    anomalyData = [];
    heatmapData = [];
    sequentialPatternData = [];
    
    // PHASE 4: Process user clustering
    let userClusteringData: any[] = [];
    try {
      const { generateUserClusteringData } = await import('../utils/ml/userClustering');
      userClusteringData = await generateUserClusteringData(normalizeActivities);
    } catch (clusteringError) {
      console.error('Error in user clustering:', clusteringError);
    }
    
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
        processingTimeSeconds: parseFloat(totalTime),
        memoryOptimization: {
          chunksUsed: true,
          stringCachingEnabled: true
        }
      }
    });
    
    // Clear string cache to reduce memory usage
    cleanupMemory();
  } catch (error) {
    console.error('Error in worker:', error);
    safePostMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

// Listen for messages from the main thread
if (isWorkerEnvironment) {
  self.onmessage = async (e: MessageEvent) => {
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
          safePostMessage({ type: 'optimizationApplied', settings: memoryOptimizer });
          break;
          
        case 'cleanup':
          cleanupMemory();
          safePostMessage({ type: 'cleanupComplete' });
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