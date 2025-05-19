import { useState, useEffect, useCallback } from 'react';
import { UserActivity } from '../types/activity';
import adaptiveConfig from '../utils/adaptiveConfig';
import schemaAdapter from '../utils/schemaAdapter';
import { useMLProcessing } from './useMLProcessing';

// Define ProgressState interface with index signature for tasks
interface ProgressState {
  [key: string]: number;
  anomaly: number;
  heatmap: number;
  sequences: number;
  clustering: number;
  overall: number;
}

interface ProcessingOptions {
  enableAdaptiveLearning: boolean;
  sampleData: boolean;
  enableStringDeduplication: boolean;
  chunkSize: number;
  processingTimeout: number;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  isComplete: boolean;
  performanceMetrics: {
    processingTime?: number;
    memoryUsed?: number;
    totalDataSize?: number;
    adaptationsApplied?: string[];
  };
}

/**
 * A hook that provides adaptive processing of user activity data,
 * with automatic schema detection, data normalization, and optimized ML processing
 */
export function useAdaptiveProcessing(rawData: any[] | string | null) {
  // State for normalized activities
  const [activities, setActivities] = useState<UserActivity[]>([]);
  
  // Use the ML processing hook for advanced analysis
  const mlProcessing = useMLProcessing();
  
  // State for processing options
  const [options, setOptions] = useState<ProcessingOptions>({
    enableAdaptiveLearning: true,
    sampleData: true,
    enableStringDeduplication: true,
    chunkSize: adaptiveConfig.get('chunkSize', 500),
    processingTimeout: 60000,
  });
  
  // State for processing status
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
    isComplete: false,
    performanceMetrics: {}
  });
  
  // Initialize config
  useEffect(() => {
    const initConfig = async () => {
      await adaptiveConfig.initialize();
      
      // Update options based on device capabilities
      setOptions(prev => ({
        ...prev,
        enableStringDeduplication: adaptiveConfig.shouldEnableFeature('stringDeduplication'),
        chunkSize: adaptiveConfig.get('chunkSize', 500),
        sampleData: adaptiveConfig.shouldEnableFeature('sampleData')
      }));
    };
    
    initConfig();
  }, []);
  
  // Function to update options
  const updateOptions = useCallback((newOptions: Partial<ProcessingOptions>) => {
    setOptions(prev => ({
      ...prev,
      ...newOptions
    }));
    
    // Apply relevant settings to ML processing if running
    if (newOptions.chunkSize && mlProcessing.isProcessing) {
      mlProcessing.processData(activities, {
        chunkSize: newOptions.chunkSize
      });
    }
  }, [mlProcessing, activities]);
  
  // Process data when it changes
  useEffect(() => {
    if (!rawData) {
      setActivities([]);
      return;
    }
    
    const processData = async () => {
      try {
        setProcessingState(prev => ({
          ...prev,
          isProcessing: true,
          progress: 0,
          error: null,
          isComplete: false
        }));
        
        const startTime = performance.now();
        let normalizedActivities: UserActivity[] = [];
        
        // Step 1: Convert raw data to normalized activities
        if (typeof rawData === 'string') {
          // Parse and normalize from string (CSV, JSON, etc.)
          normalizedActivities = schemaAdapter.parseAndNormalizeData(rawData);
        } else if (Array.isArray(rawData)) {
          // Normalize from array of objects
          normalizedActivities = schemaAdapter.normalizeActivities(rawData);
        }
        
        setProcessingState(prev => ({ ...prev, progress: 0.3 }));
        
        // Step 2: Apply adaptive sampling for large datasets
        let processableActivities = normalizedActivities;
        const adaptationsApplied: string[] = [];
        
        if (options.sampleData && normalizedActivities.length > adaptiveConfig.get('maxSampleSize', 1000)) {
          const maxSamples = adaptiveConfig.get('maxSampleSize', 1000);
          const samplingRate = Math.floor(normalizedActivities.length / maxSamples);
          
          const sampledActivities: UserActivity[] = [];
          for (let i = 0; i < normalizedActivities.length; i += samplingRate) {
            sampledActivities.push(normalizedActivities[i]);
            if (sampledActivities.length >= maxSamples) break;
          }
          
          processableActivities = sampledActivities;
          adaptationsApplied.push(`Sampled data from ${normalizedActivities.length} to ${processableActivities.length} activities`);
        }
        
        setProcessingState(prev => ({ ...prev, progress: 0.5 }));
        
        // Step 3: Validate and sanitize all activities to ensure data quality
        const validatedActivities = processableActivities.map(activity => {
          if (!schemaAdapter.validateActivity(activity)) {
            // Sanitize invalid activities
            adaptationsApplied.push('Applied data sanitization');
            return schemaAdapter.sanitizeActivity(activity);
          }
          return activity;
        }).filter(Boolean) as UserActivity[];
        
        // Calculate performance metrics
        const dataSize = JSON.stringify(validatedActivities).length;
        const endTime = performance.now();
        const processingTime = (endTime - startTime) / 1000;
        
        // Record performance for learning
        if (options.enableAdaptiveLearning) {
          adaptiveConfig.recordPerformance({
            processingTime,
            dataSize,
            success: true,
            operationType: 'processing',
            settings: {
              ...options
            }
          });
        }
        
        // Update state with processed activities
        setActivities(validatedActivities);
        
        setProcessingState(prev => ({
          ...prev,
          isProcessing: false,
          progress: 1,
          isComplete: true,
          performanceMetrics: {
            processingTime,
            totalDataSize: dataSize,
            adaptationsApplied
          }
        }));
        
        console.log(`Adaptive processing complete: ${validatedActivities.length} activities processed in ${processingTime.toFixed(2)}s`);
      } catch (error) {
        console.error('Error in adaptive processing:', error);
        
        setProcessingState(prev => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'Unknown error in data processing',
          isComplete: true
        }));
        
        // Record failure for learning
        if (options.enableAdaptiveLearning) {
          adaptiveConfig.recordPerformance({
            processingTime: 0,
            dataSize: typeof rawData === 'string' ? rawData.length : JSON.stringify(rawData).length,
            success: false,
            operationType: 'processing',
            settings: {
              ...options
            }
          });
        }
      }
    };
    
    processData();
  }, [rawData, options.enableAdaptiveLearning, options.sampleData, options.chunkSize]);
  
  // Cancel processing if needed
  const cancelProcessing = useCallback(() => {
    if (mlProcessing.isProcessing) {
      mlProcessing.cancelProcessing();
    }
    
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false,
      error: 'Processing cancelled by user',
      isComplete: true
    }));
  }, [mlProcessing]);
  
  // Reset all state
  const reset = useCallback(() => {
    setActivities([]);
    setProcessingState({
      isProcessing: false,
      progress: 0,
      error: null,
      isComplete: false,
      performanceMetrics: {}
    });
  }, []);
  
  // Reconfigure options based on device/data characteristics
  const optimizeForCurrentDevice = useCallback(async () => {
    await adaptiveConfig.initialize();
    
    const newOptions = {
      chunkSize: adaptiveConfig.get('chunkSize', 500),
      enableStringDeduplication: adaptiveConfig.shouldEnableFeature('stringDeduplication'),
      sampleData: adaptiveConfig.shouldEnableFeature('sampleData')
    };
    
    updateOptions(newOptions);
    
    return newOptions;
  }, [updateOptions]);
  
  // Return values and functions
  return {
    // Data
    activities,
    rawCount: Array.isArray(rawData) ? rawData.length : 0,
    normalizedCount: activities.length,
    
    // Processing state
    ...processingState,
    
    // ML results (from ML processing hook)
    mlResults: mlProcessing.results,
    mlProgress: mlProcessing.progress,
    mlIsProcessing: mlProcessing.isProcessing,
    mlError: mlProcessing.error,
    
    // Configuration
    options,
    updateOptions,
    optimizeForCurrentDevice,
    
    // Actions
    cancelProcessing,
    reset
  };
} 