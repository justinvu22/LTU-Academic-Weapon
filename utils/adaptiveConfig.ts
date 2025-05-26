// Default configuration with initial conservative values
const DEFAULT_CONFIG: Record<string, any> = {
  // Performance settings
  chunkSize: 500,
  batchSize: 100,
  maxSampleSize: 1000,
  stringDeduplication: true,
  
  // Processing settings
  anomalyDetectionThreshold: 0.7,
  heatmapResolution: 'medium',
  sequenceMinLength: 3,
  clusteringMethod: 'kmeans',
  
  // Storage settings
  useIndividualStorage: true,
  compressionLevel: 'medium',
  recoveryThreshold: 50,
  
  // Optimization settings
  adaptationRate: 0.2, // How quickly to adapt to new performance data (0-1)
  learningEnabled: true,
};

interface PerformanceData {
  processingTime: number;
  memoryUsage?: number;
  dataSize: number;
  success: boolean;
  operationType: 'storage' | 'retrieval' | 'processing';
  settings: Record<string, any>;
  timestamp: number;
}

interface SystemState {
  devicePerformanceScore?: number;
  availableMemory?: number;
  storageQuota?: number;
  networkType?: string;
  lastUpdate: number;
}

/**
 * AdaptiveConfig - A self-learning configuration system that adapts
 * based on device capabilities and performance history
 */
export class AdaptiveConfig {
  private config: Record<string, any>;
  private performanceHistory: PerformanceData[] = [];
  private systemState: SystemState;
  private storageKey = 'adaptive_config_v1';
  private performanceStorageKey = 'performance_history_v1';
  private initialized = false;
  private static instance: AdaptiveConfig;
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.systemState = { lastUpdate: Date.now() };
    this.loadSavedConfig();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AdaptiveConfig {
    if (!AdaptiveConfig.instance) {
      AdaptiveConfig.instance = new AdaptiveConfig();
    }
    return AdaptiveConfig.instance;
  }
  
  /**
   * Initialize the configuration with device detection
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Load any saved configuration
    this.loadSavedConfig();
    
    // Detect system capabilities
    await this.detectSystemCapabilities();
    
    // Optimize initial configuration based on device
    this.optimizeForDevice();
    
    this.initialized = true;
    console.log('Adaptive configuration initialized:', this.config);
  }
  
  /**
   * Detect system capabilities (memory, storage, performance)
   */
  private async detectSystemCapabilities(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return;
      }
      
      // Estimate device performance using navigator.deviceMemory and hardwareConcurrency
      let performanceScore = 1; // Default baseline
      
      // Check available memory (available in some browsers)
      if ('deviceMemory' in navigator) {
        // Fix typing issue by properly casting to number
        const memory = (navigator as any).deviceMemory as number;
        this.systemState.availableMemory = memory;
        
        // Adjust score based on memory
        performanceScore *= (memory / 4); // Normalize around 4GB
      }
      
      // Check CPU cores
      if ('hardwareConcurrency' in navigator) {
        const cores = navigator.hardwareConcurrency;
        
        // Adjust score based on cores
        performanceScore *= (cores / 4); // Normalize around 4 cores
      }
      
      // Check storage quota if available
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        this.systemState.storageQuota = estimate.quota;
      }
      
      // Check network type if available
      // @ts-ignore - connection is not in all TypeScript definitions
      if (navigator.connection) {
        // @ts-ignore
        this.systemState.networkType = navigator.connection.effectiveType;
      }
      
      // Store the computed performance score
      this.systemState.devicePerformanceScore = Math.max(0.5, Math.min(performanceScore, 3));
      this.systemState.lastUpdate = Date.now();
      
      console.log('System capabilities detected:', this.systemState);
    } catch (error) {
      console.warn('Error detecting system capabilities:', error);
      // Set default conservative values
      this.systemState.devicePerformanceScore = 1;
    }
  }
  
  /**
   * Optimize configuration for the current device
   */
  private optimizeForDevice(): void {
    if (!this.systemState.devicePerformanceScore) return;
    
    const score = this.systemState.devicePerformanceScore;
    
    // Adjust chunk size based on device performance
    this.config.chunkSize = Math.round(this.config.chunkSize * score);
    
    // Adjust batch size
    this.config.batchSize = Math.round(this.config.batchSize * score);
    
    // Adjust max sample size
    this.config.maxSampleSize = Math.round(this.config.maxSampleSize * score);
    
    // For low memory devices, adjust settings to conserve memory
    if (this.systemState.availableMemory && this.systemState.availableMemory < 4) {
      this.config.stringDeduplication = true;
      this.config.compressionLevel = 'high';
      
      // For very low memory, disable some memory-intensive features
      if (this.systemState.availableMemory < 2) {
        this.config.useIndividualStorage = false;
        this.config.recoveryThreshold = 25; // Smaller chunks for recovery
      }
    }
    
    // For low storage devices, adjust settings to use less storage
    if (this.systemState.storageQuota && this.systemState.storageQuota < 50 * 1024 * 1024) {
      this.config.compressionLevel = 'high';
    }
    
    // For slow networks, adjust settings
    if (this.systemState.networkType === '2g' || this.systemState.networkType === 'slow-2g') {
      this.config.maxSampleSize = Math.min(this.config.maxSampleSize, 500);
    }
    
    // Save the optimized configuration
    this.saveConfig();
  }
  
  /**
   * Get a configuration value
   */
  public get<T>(key: string, defaultValue?: T): T {
    return (key in this.config) ? this.config[key] : (defaultValue as T);
  }
  
  /**
   * Get all configuration
   */
  public getAll(): Record<string, any> {
    return { ...this.config };
  }
  
  /**
   * Set a configuration value manually
   */
  public set<T>(key: string, value: T): void {
    this.config[key] = value;
    this.saveConfig();
  }
  
  /**
   * Record performance data to learn from
   */
  public recordPerformance(data: Omit<PerformanceData, 'timestamp'>): void {
    if (!this.config.learningEnabled) return;
    
    const performanceEntry: PerformanceData = {
      ...data,
      timestamp: Date.now()
    };
    
    // Add to history
    this.performanceHistory.push(performanceEntry);
    
    // Trim history to last 50 entries
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }
    
    // Save performance history
    this.savePerformanceHistory();
    
    // Learn from new data
    this.learnFromPerformance();
  }
  
  /**
   * Analyze performance data and adjust configuration
   */
  private learnFromPerformance(): void {
    if (this.performanceHistory.length < 5) return;
    
    try {
      // Analyze storage operations
      this.optimizeStorageSettings();
      
      // Analyze processing operations
      this.optimizeProcessingSettings();
      
      // Save updated configuration
      this.saveConfig();
    } catch (error) {
      console.warn('Error learning from performance data:', error);
    }
  }
  
  /**
   * Optimize storage settings based on performance data
   */
  private optimizeStorageSettings(): void {
    // Get storage operations
    const storageOps = this.performanceHistory.filter(
      entry => entry.operationType === 'storage' || entry.operationType === 'retrieval'
    );
    
    if (storageOps.length < 3) return;
    
    // Calculate success rate
    const successRate = storageOps.filter(op => op.success).length / storageOps.length;
    
    // If success rate is low, make settings more conservative
    if (successRate < 0.8) {
      const newChunkSize = Math.max(100, Math.floor(this.config.chunkSize * 0.8));
      const newBatchSize = Math.max(25, Math.floor(this.config.batchSize * 0.8));
      
      // Apply changes gradually using adaptation rate
      this.config.chunkSize = Math.round(
        this.config.chunkSize * (1 - this.config.adaptationRate) + 
        newChunkSize * this.config.adaptationRate
      );
      
      this.config.batchSize = Math.round(
        this.config.batchSize * (1 - this.config.adaptationRate) + 
        newBatchSize * this.config.adaptationRate
      );
      
      console.log('Adjusted storage settings for better reliability:', {
        chunkSize: this.config.chunkSize,
        batchSize: this.config.batchSize
      });
    } 
    // If success rate is high, see if we can improve performance
    else if (successRate > 0.95) {
      // Find successful operations
      const successfulOps = storageOps.filter(op => op.success);
      
      // Group by chunk size and calculate average processing time
      const chunkPerformance: Record<number, number[]> = {};
      successfulOps.forEach(op => {
        const chunkSize = op.settings.chunkSize || this.config.chunkSize;
        if (!chunkPerformance[chunkSize]) {
          chunkPerformance[chunkSize] = [];
        }
        chunkPerformance[chunkSize].push(op.processingTime);
      });
      
      // Find the best performing chunk size
      let bestChunkSize = this.config.chunkSize;
      let bestAvgTime = Number.MAX_VALUE;
      
      Object.entries(chunkPerformance).forEach(([sizeStr, times]) => {
        const size = parseInt(sizeStr, 10);
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        
        if (avgTime < bestAvgTime) {
          bestAvgTime = avgTime;
          bestChunkSize = size;
        }
      });
      
      // If the best size is different, gradually shift toward it
      if (bestChunkSize !== this.config.chunkSize) {
        this.config.chunkSize = Math.round(
          this.config.chunkSize * (1 - this.config.adaptationRate) + 
          bestChunkSize * this.config.adaptationRate
        );
        
        console.log('Optimized chunk size for better performance:', this.config.chunkSize);
      }
    }
  }
  
  /**
   * Optimize processing settings based on performance data
   */
  private optimizeProcessingSettings(): void {
    // Get processing operations
    const processingOps = this.performanceHistory.filter(
      entry => entry.operationType === 'processing'
    );
    
    if (processingOps.length < 3) return;
    
    // Calculate success rate
    const successRate = processingOps.filter(op => op.success).length / processingOps.length;
    
    // If success rate is low, make the sample size smaller
    if (successRate < 0.8) {
      const newSampleSize = Math.floor(this.config.maxSampleSize * 0.8);
      
      // Apply changes gradually
      this.config.maxSampleSize = Math.max(
        200,
        Math.round(
          this.config.maxSampleSize * (1 - this.config.adaptationRate) + 
          newSampleSize * this.config.adaptationRate
        )
      );
      
      console.log('Reduced max sample size for better reliability:', this.config.maxSampleSize);
    }
    // If success rate is high with larger datasets, gradually increase sample size
    else if (successRate > 0.95) {
      // Get average data size of successful operations
      const successfulOps = processingOps.filter(op => op.success);
      const avgDataSize = successfulOps.reduce((sum, op) => sum + op.dataSize, 0) / successfulOps.length;
      
      // If we're successfully processing datasets near our max, try increasing the max
      if (avgDataSize > this.config.maxSampleSize * 0.8) {
        const newSampleSize = Math.floor(this.config.maxSampleSize * 1.2);
        
        // Apply changes gradually
        this.config.maxSampleSize = Math.min(
          3000, // Hard upper limit
          Math.round(
            this.config.maxSampleSize * (1 - this.config.adaptationRate) + 
            newSampleSize * this.config.adaptationRate
          )
        );
        
        console.log('Increased max sample size for better analysis:', this.config.maxSampleSize);
      }
    }
  }
  
  /**
   * Load configuration from localStorage
   */
  private loadSavedConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          this.config = { ...this.config, ...parsedConfig };
          
          // Also load performance history
          const savedHistory = localStorage.getItem(this.performanceStorageKey);
          if (savedHistory) {
            this.performanceHistory = JSON.parse(savedHistory);
          }
          
          console.log('Loaded saved configuration:', this.config);
        }
      }
    } catch (error) {
      console.warn('Error loading saved configuration:', error);
    }
  }
  
  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      }
    } catch (error) {
      console.warn('Error saving configuration:', error);
    }
  }
  
  /**
   * Save performance history to localStorage
   */
  private savePerformanceHistory(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.performanceStorageKey, JSON.stringify(this.performanceHistory));
      }
    } catch (error) {
      console.warn('Error saving performance history:', error);
    }
  }
  
  /**
   * Get a recommended chunk size for the given data size
   */
  public getRecommendedChunkSize(dataSize: number): number {
    // Base chunk size on configuration
    let chunkSize = this.config.chunkSize;
    
    // For very large datasets, decrease chunk size to avoid memory issues
    if (dataSize > 5000) {
      chunkSize = Math.floor(chunkSize * 0.6);
    } else if (dataSize > 2000) {
      chunkSize = Math.floor(chunkSize * 0.8);
    }
    
    // For very small datasets, ensure chunks aren't too small
    if (dataSize < 500) {
      chunkSize = Math.min(chunkSize, Math.max(50, Math.floor(dataSize / 2)));
    }
    
    return chunkSize;
  }
  
  /**
   * Check if a feature should be enabled based on device capabilities
   */
  public shouldEnableFeature(featureName: string): boolean {
    // If we haven't detected system capabilities, assume conservative defaults
    if (!this.systemState.devicePerformanceScore) {
      return DEFAULT_CONFIG[featureName] || false;
    }
    
    // Memory-intensive features
    const memoryIntensiveFeatures = ['stringDeduplication', 'useIndividualStorage'];
    if (memoryIntensiveFeatures.includes(featureName)) {
      // For low memory devices, be more conservative
      if (this.systemState.availableMemory && this.systemState.availableMemory < 2) {
        // Only enable string deduplication on low memory devices
        return featureName === 'stringDeduplication';
      }
    }
    
    // Performance-intensive features
    const performanceFeatures = ['heatmapResolution'];
    if (performanceFeatures.includes(featureName)) {
      // For low performance devices, disable or use low resolution
      if (this.systemState.devicePerformanceScore < 0.8) {
        return false;
      }
    }
    
    // Default to configuration value or false
    return this.config[featureName] || false;
  }
  
  /**
   * Force a reset to default configuration
   */
  public resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.performanceHistory = [];
    this.saveConfig();
    this.savePerformanceHistory();
    console.log('Configuration reset to defaults');
  }
}

// Export a singleton instance for convenience
export const adaptiveConfig = AdaptiveConfig.getInstance();

export default adaptiveConfig; 