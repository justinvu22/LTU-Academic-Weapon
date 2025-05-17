import { useState, useEffect, useCallback, useRef } from 'react';
import { UserActivity } from '../types/activity';

/**
 * Check if code is running in browser
 */
const isBrowser = () => typeof window !== 'undefined';

/**
 * Check if web workers are supported
 */
const isWebWorkerSupported = () => {
  if (!isBrowser()) return false;
  return typeof Worker !== 'undefined';
};

// Initialize the ML worker for browser environments
const initWorker = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Create a web worker using a blob URL for better performance
    const workerCode = `
      // Import worker script content
      importScripts('${window.location.origin}/workers/ml-worker.js');
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    return new Worker(workerUrl);
  } catch (error) {
    console.error('Failed to create web worker:', error);
    return null;
  }
};

// Create a debounce function to limit how often a function can be called
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

interface MLProcessingResult {
  anomalyTimelineData: any[];
  heatmapData: any[];
  sequentialPatternData: any[];
  userClusteringData: any[];
  processingStats?: {
    totalActivities: number;
    processingTimeSeconds: number;
    memoryOptimization?: {
      chunksUsed: boolean;
      stringCachingEnabled: boolean;
    }
  };
}

interface MLProcessingOptions {
  includeAnomalyDetection?: boolean;
  includeHeatmapAnalysis?: boolean;
  includeSequenceAnalysis?: boolean;
  includeUserClustering?: boolean;
  optimizationLevel?: 'low' | 'medium' | 'high';
  chunkSize?: number;
  useWebWorker?: boolean;
}

// Default options
const DEFAULT_OPTIONS: MLProcessingOptions = {
  includeAnomalyDetection: true,
  includeHeatmapAnalysis: true,
  includeSequenceAnalysis: true,
  includeUserClustering: true,
  optimizationLevel: 'medium',
  chunkSize: 500,
  useWebWorker: true
};

export const useMLProcessing = (initialActivities: UserActivity[] = []) => {
  const [results, setResults] = useState<MLProcessingResult>({
    anomalyTimelineData: [],
    heatmapData: [],
    sequentialPatternData: [],
    userClusteringData: []
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    anomaly: 0,
    heatmap: 0,
    sequences: 0,
    clustering: 0,
    overall: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    processingTime: number;
    memoryUsage: number;
    optimizationUsed: boolean;
  } | null>(null);
  
  // Use a ref to track the worker instance
  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cleanup function for the worker
  const cleanupWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  // Initialize worker when needed
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = initWorker();
    }
    return workerRef.current;
  }, []);
  
  // Handle worker messages
  const setupWorkerListeners = useCallback((worker: Worker) => {
    worker.onmessage = (event) => {
      const { type, task, progress: taskProgress, data, name, error: workerError, processingStats } = event.data;
      
      switch (type) {
        case 'progress':
          setProgress(prev => {
            const newProgress = { ...prev };
            if (task) {
              newProgress[task] = taskProgress || 0;
            }
            
            // Calculate overall progress based on all tasks
            const keys = ['anomaly', 'heatmap', 'sequences', 'clustering'];
            const sum = keys.reduce((acc, key) => acc + (task === key ? taskProgress : prev[key]), 0);
            newProgress.overall = sum / keys.length;
            
            return newProgress;
          });
          break;
          
        case 'partialResult':
          if (name && data) {
            setResults(prev => ({ ...prev, [name]: data }));
          }
          break;
          
        case 'error':
          setError(workerError || 'Unknown error in worker');
          setIsProcessing(false);
          break;
          
        case 'status':
          setStatusMessage(event.data.message || '');
          break;
          
        case 'complete':
          setIsProcessing(false);
          if (processingStats) {
            setPerformanceMetrics({
              processingTime: processingStats.processingTimeSeconds,
              memoryUsage: 0, // This is estimated on the worker side
              optimizationUsed: processingStats.memoryOptimization?.chunksUsed || false
            });
          }
          break;
          
        default:
          console.log('Unhandled worker message:', event.data);
      }
    };
    
    worker.onerror = (error) => {
      console.error('Web worker error:', error);
      setError('Web worker error: ' + (error.message || 'Unknown error'));
      setIsProcessing(false);
    };
  }, []);
  
  // Process data with ML algorithms
  const processData = useCallback(async (
    activities: UserActivity[],
    options: MLProcessingOptions = DEFAULT_OPTIONS
  ) => {
    // Reset state
    setError(null);
    setIsProcessing(true);
    setProgress({
      anomaly: 0,
      heatmap: 0,
      sequences: 0,
      clustering: 0,
      overall: 0
    });
    setStatusMessage('Initializing ML processing...');
    
    // Create a new abort controller for this processing run
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    // Track performance
    const startTime = performance.now();
    
    try {
      // Bail out for empty datasets
      if (!activities || activities.length === 0) {
        setError('No activities to process');
        setIsProcessing(false);
        return;
      }
      
      // Deduplicate activities by ID to prevent processing duplicates
      const uniqueActivities = Array.from(
        new Map(activities.map(a => [a.id, a])).values()
      );
      
      console.log(`Processing ${uniqueActivities.length} unique activities (${activities.length - uniqueActivities.length} duplicates removed)`);
      
      // Determine if we should use a worker based on options and environment
      const useWorker = options.useWebWorker !== false && typeof window !== 'undefined';
      
      if (useWorker) {
        // Worker-based processing
        const worker = getWorker();
        
        if (!worker) {
          throw new Error('Web workers are not supported in this environment');
        }
        
        // Set up worker message listeners
        setupWorkerListeners(worker);
        
        // Configure the worker
        worker.postMessage({
          action: 'optimize',
          data: {
            chunkSize: options.chunkSize || 500,
            reportFrequency: 300
          }
        });
        
        // Start processing
        worker.postMessage({
          action: 'processActivities',
          data: {
            activities: uniqueActivities,
            options: {
              includeAnomalyDetection: options.includeAnomalyDetection,
              includeHeatmapAnalysis: options.includeHeatmapAnalysis,
              includeSequenceAnalysis: options.includeSequenceAnalysis,
              includeUserClustering: options.includeUserClustering,
              optimizationLevel: options.optimizationLevel
            }
          }
        });
        
        // Check if processing was aborted
        signal.addEventListener('abort', () => {
          console.log('ML processing aborted');
          cleanupWorker();
          setIsProcessing(false);
        });
      } else {
        // Fallback implementation without web workers
        await processWithoutWorker(uniqueActivities, options, signal);
      }
      
    } catch (error) {
      console.error('Error in ML processing:', error);
      setError(`ML processing error: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessing(false);
    }
    
    const processingTime = (performance.now() - startTime) / 1000;
    console.log(`ML processing ${isProcessing ? 'still running' : 'completed'} in ${processingTime.toFixed(2)}s`);
    
    // Update performance metrics if not already set by worker
    if (!performanceMetrics) {
      setPerformanceMetrics({
        processingTime,
        memoryUsage: 0,
        optimizationUsed: Boolean(options.optimizationLevel)
      });
    }
  }, [cleanupWorker, getWorker, setupWorkerListeners, performanceMetrics]);
  
  // Process data without using a web worker
  const processWithoutWorker = async (
    activities: UserActivity[],
    options: MLProcessingOptions,
    signal: AbortSignal
  ) => {
    try {
      setStatusMessage('Processing activities using client-side ML algorithms...');
      
      // Process in phases
      if (options.includeAnomalyDetection !== false) {
        setStatusMessage('Detecting anomalies...');
        setProgress(prev => ({ ...prev, anomaly: 0.1 }));
        
        if (signal.aborted) return;
        
        try {
          const { generateAnomalyTimelineData } = await import('../utils/ml/anomalyDetection');
          const anomalyData = await generateAnomalyTimelineData(activities);
          setResults(prev => ({ ...prev, anomalyTimelineData: anomalyData }));
          setProgress(prev => ({ ...prev, anomaly: 1.0 }));
        } catch (error) {
          console.error('Error in anomaly detection:', error);
        }
      }
      
      if (options.includeHeatmapAnalysis !== false) {
        setStatusMessage('Generating activity heatmap...');
        setProgress(prev => ({ ...prev, heatmap: 0.1 }));
        
        if (signal.aborted) return;
        
        try {
          const { generateHeatmapData } = await import('../utils/ml/heatmapAnalysis');
          const heatmapData = await generateHeatmapData(activities);
          setResults(prev => ({ ...prev, heatmapData }));
          setProgress(prev => ({ ...prev, heatmap: 1.0 }));
        } catch (error) {
          console.error('Error in heatmap analysis:', error);
        }
      }
      
      if (options.includeSequenceAnalysis !== false) {
        setStatusMessage('Analyzing activity sequences...');
        setProgress(prev => ({ ...prev, sequences: 0.1 }));
        
        if (signal.aborted) return;
        
        try {
          const { generateSequentialPatternData } = await import('../utils/ml/sequencePatterns');
          const sequenceData = await generateSequentialPatternData(activities);
          setResults(prev => ({ ...prev, sequentialPatternData: sequenceData }));
          setProgress(prev => ({ ...prev, sequences: 1.0 }));
        } catch (error) {
          console.error('Error in sequence analysis:', error);
        }
      }
      
      if (options.includeUserClustering !== false) {
        setStatusMessage('Clustering user behaviors...');
        setProgress(prev => ({ ...prev, clustering: 0.1 }));
        
        if (signal.aborted) return;
        
        try {
          const { generateUserClusteringData } = await import('../utils/ml/userClustering');
          const clusterData = await generateUserClusteringData(activities);
          setResults(prev => ({ ...prev, userClusteringData: clusterData }));
          setProgress(prev => ({ ...prev, clustering: 1.0 }));
        } catch (error) {
          console.error('Error in user clustering:', error);
        }
      }
      
      // Calculate overall progress
      const keys = ['anomaly', 'heatmap', 'sequences', 'clustering'];
      const sum = keys.reduce((acc, key) => acc + progress[key], 0);
      setProgress(prev => ({ ...prev, overall: sum / keys.length }));
      
      setStatusMessage('ML processing complete');
      setIsProcessing(false);
    } catch (error) {
      console.error('Error in fallback ML processing:', error);
      setError(`ML processing error: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessing(false);
    }
  };
  
  // Throttled version of processData to prevent rapid multiple calls
  const processDataThrottled = useCallback(
    debounce((activities: UserActivity[], options?: MLProcessingOptions) => {
      processData(activities, options);
    }, 300),
    [processData]
  );
  
  // Cancel ongoing processing
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cleanupWorker();
    setIsProcessing(false);
    setStatusMessage('Processing cancelled');
  }, [cleanupWorker]);
  
  // Process initial activities when provided
  useEffect(() => {
    if (initialActivities && initialActivities.length > 0) {
      // Only process if we have enough data for meaningful analysis
      if (initialActivities.length >= 10) {
        processData(initialActivities);
      }
    }
  }, [initialActivities]); // Dependency on initialActivities
  
  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      cleanupWorker();
    };
  }, [cleanupWorker]);
  
  return {
    processData,
    processDataThrottled,
    cancelProcessing,
    isProcessing,
    progress,
    results,
    error,
    statusMessage,
    performanceMetrics
  };
}; 