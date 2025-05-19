import { UserActivity } from '../types/activity';

/**
 * ThreatLearner - A utility that learns and adapts to evolving threat patterns
 * based on user feedback and historical data analysis
 */

// Threat pattern types
export enum ThreatPatternType {
  DATA_EXFILTRATION = 'data_exfiltration',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  UNUSUAL_TIMING = 'unusual_timing',
  SUSPICIOUS_SEQUENCE = 'suspicious_sequence',
  POLICY_VIOLATION = 'policy_violation',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  CREDENTIAL_MISUSE = 'credential_misuse'
}

// Feedback types for learning
export enum FeedbackType {
  TRUE_POSITIVE = 'true_positive',   // Correctly identified threat
  FALSE_POSITIVE = 'false_positive', // Incorrectly flagged as threat
  TRUE_NEGATIVE = 'true_negative',   // Correctly identified as normal
  FALSE_NEGATIVE = 'false_negative'  // Missed actual threat
}

interface ThreatPattern {
  id: string;
  name: string;
  type: ThreatPatternType;
  confidence: number;
  description: string;
  indicators: ThreatIndicator[];
  detectionCount: number;
  falsePositiveCount: number;
  lastUpdated: string;
  createdAt: string;
}

interface ThreatIndicator {
  fieldPath: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches_regex' | 'time_window';
  value: any;
  weight: number;
}

interface FeedbackEntry {
  patternId: string;
  activityId: string;
  feedbackType: FeedbackType;
  timestamp: string;
  additionalNotes?: string;
}

interface ThreatLearnerState {
  knownPatterns: ThreatPattern[];
  userFeedback: FeedbackEntry[];
  lastAnalysisDate: string;
  patternMatchThreshold: number;
  adaptationRate: number;
}

/**
 * LocalStorageKeys for persisting learner state
 */
const StorageKeys = {
  LEARNER_STATE: 'threat_learner_state_v1',
  FEEDBACK_HISTORY: 'threat_feedback_history_v1'
};

/**
 * Default threat patterns to start with
 */
const DEFAULT_PATTERNS: ThreatPattern[] = [
  {
    id: 'exfil_1',
    name: 'Large file download pattern',
    type: ThreatPatternType.DATA_EXFILTRATION,
    confidence: 0.8,
    description: 'User downloading unusually large files or excessive number of files',
    indicators: [
      { 
        fieldPath: 'values.fileSize', 
        condition: 'greater_than', 
        value: 50000000, // 50MB
        weight: 0.7 
      },
      { 
        fieldPath: 'values.downloadCount', 
        condition: 'greater_than', 
        value: 20,
        weight: 0.6 
      },
      { 
        fieldPath: 'timestamp', 
        condition: 'time_window', 
        value: { outsideHours: true, window: [19, 6] }, // 7PM - 6AM
        weight: 0.4 
      }
    ],
    detectionCount: 0,
    falsePositiveCount: 0,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'access_1',
    name: 'Multiple failed login attempts',
    type: ThreatPatternType.UNAUTHORIZED_ACCESS,
    confidence: 0.75,
    description: 'Multiple failed login attempts from same user or IP',
    indicators: [
      { 
        fieldPath: 'activityType', 
        condition: 'equals', 
        value: 'login_failed',
        weight: 0.8 
      },
      { 
        fieldPath: 'values.failureCount', 
        condition: 'greater_than', 
        value: 3,
        weight: 0.7 
      },
      { 
        fieldPath: 'values.timeWindow', 
        condition: 'less_than', 
        value: 300, // 5 minutes
        weight: 0.6 
      }
    ],
    detectionCount: 0,
    falsePositiveCount: 0,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

/**
 * Main ThreatLearner class for managing threat pattern detection and learning
 */
class ThreatLearner {
  private state: ThreatLearnerState;
  private static instance: ThreatLearner;
  
  /**
   * Private constructor (use getInstance)
   */
  private constructor() {
    this.state = {
      knownPatterns: DEFAULT_PATTERNS,
      userFeedback: [],
      lastAnalysisDate: new Date().toISOString(),
      patternMatchThreshold: 0.65, // Default threshold for matching
      adaptationRate: 0.2          // How quickly to adapt from feedback (0-1)
    };
    
    this.loadState();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ThreatLearner {
    if (!ThreatLearner.instance) {
      ThreatLearner.instance = new ThreatLearner();
    }
    return ThreatLearner.instance;
  }
  
  /**
   * Load learner state from localStorage
   */
  private loadState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedState = localStorage.getItem(StorageKeys.LEARNER_STATE);
        if (savedState) {
          this.state = {
            ...this.state,
            ...JSON.parse(savedState)
          };
        }
        
        const savedFeedback = localStorage.getItem(StorageKeys.FEEDBACK_HISTORY);
        if (savedFeedback) {
          this.state.userFeedback = JSON.parse(savedFeedback);
        }
        
        console.log('Loaded threat learner state:', this.state.knownPatterns.length, 'patterns');
      }
    } catch (error) {
      console.warn('Error loading threat learner state:', error);
    }
  }
  
  /**
   * Save current state to localStorage
   */
  private saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(StorageKeys.LEARNER_STATE, JSON.stringify({
          knownPatterns: this.state.knownPatterns,
          lastAnalysisDate: this.state.lastAnalysisDate,
          patternMatchThreshold: this.state.patternMatchThreshold,
          adaptationRate: this.state.adaptationRate
        }));
        
        // Save feedback separately to avoid storage size issues
        localStorage.setItem(StorageKeys.FEEDBACK_HISTORY, JSON.stringify(this.state.userFeedback));
      }
    } catch (error) {
      console.warn('Error saving threat learner state:', error);
    }
  }
  
  /**
   * Analyze an activity against known threat patterns
   */
  public analyzeActivity(activity: UserActivity): {
    matches: Array<{ patternId: string; confidence: number; threatType: ThreatPatternType }>;
    highestConfidence: number;
  } {
    const matches: Array<{ patternId: string; confidence: number; threatType: ThreatPatternType }> = [];
    let highestConfidence = 0;
    
    // Check each pattern
    for (const pattern of this.state.knownPatterns) {
      const matchConfidence = this.calculatePatternMatch(activity, pattern);
      
      // If confidence exceeds threshold, consider it a match
      if (matchConfidence >= this.state.patternMatchThreshold) {
        matches.push({
          patternId: pattern.id,
          confidence: matchConfidence,
          threatType: pattern.type
        });
        
        // Update highest confidence
        highestConfidence = Math.max(highestConfidence, matchConfidence);
      }
    }
    
    return { matches, highestConfidence };
  }
  
  /**
   * Calculate the confidence level of an activity matching a threat pattern
   */
  private calculatePatternMatch(activity: UserActivity, pattern: ThreatPattern): number {
    let totalWeight = 0;
    let weightedMatches = 0;
    
    // Check each indicator
    for (const indicator of pattern.indicators) {
      const match = this.matchIndicator(activity, indicator);
      weightedMatches += match * indicator.weight;
      totalWeight += indicator.weight;
    }
    
    // Calculate overall confidence (weighted average)
    return totalWeight > 0 ? weightedMatches / totalWeight : 0;
  }
  
  /**
   * Check if an activity matches a specific indicator
   * Returns a number between 0 (no match) and 1 (perfect match)
   */
  private matchIndicator(activity: UserActivity, indicator: ThreatIndicator): number {
    // Get the field value using the path
    const fieldValue = this.getNestedValue(activity, indicator.fieldPath);
    
    // If field doesn't exist, no match
    if (fieldValue === undefined) return 0;
    
    // Check against different conditions
    switch (indicator.condition) {
      case 'equals':
        return fieldValue === indicator.value ? 1 : 0;
        
      case 'contains':
        if (typeof fieldValue === 'string' && typeof indicator.value === 'string') {
          return fieldValue.toLowerCase().includes(indicator.value.toLowerCase()) ? 1 : 0;
        }
        return 0;
        
      case 'greater_than':
        if (typeof fieldValue === 'number' && typeof indicator.value === 'number') {
          // For numeric comparisons, use a gradient if close to the threshold
          if (fieldValue > indicator.value) {
            const ratio = Math.min(fieldValue / indicator.value, 2);
            return Math.min(0.5 + 0.5 * (ratio - 1), 1); // Scale to 0.5-1.0 range
          }
          return 0;
        }
        return 0;
        
      case 'less_than':
        if (typeof fieldValue === 'number' && typeof indicator.value === 'number') {
          if (fieldValue < indicator.value) {
            const ratio = Math.min(indicator.value / (fieldValue || 1), 2);
            return Math.min(0.5 + 0.5 * (ratio - 1), 1); // Scale to 0.5-1.0 range
          }
          return 0;
        }
        return 0;
        
      case 'matches_regex':
        if (typeof fieldValue === 'string' && typeof indicator.value === 'string') {
          try {
            const regex = new RegExp(indicator.value);
            return regex.test(fieldValue) ? 1 : 0;
          } catch (e) {
            console.warn('Invalid regex in threat pattern:', indicator.value);
            return 0;
          }
        }
        return 0;
        
      case 'time_window':
        if (typeof fieldValue === 'string' && indicator.value.outsideHours) {
          try {
            // Check if timestamp is outside normal working hours
            const activityDate = new Date(fieldValue);
            const hour = activityDate.getHours();
            const [start, end] = indicator.value.window as [number, number];
            
            // If time is outside the window (e.g., outside 8AM-6PM)
            const outsideWindow = (hour >= start || hour < end);
            return outsideWindow ? 1 : 0;
          } catch (e) {
            return 0;
          }
        }
        return 0;
        
      default:
        return 0;
    }
  }
  
  /**
   * Helper to get a nested value from an object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * Add user feedback about a threat detection
   */
  public addFeedback(feedback: Omit<FeedbackEntry, 'timestamp'>): void {
    const feedbackEntry: FeedbackEntry = {
      ...feedback,
      timestamp: new Date().toISOString()
    };
    
    // Add to feedback history
    this.state.userFeedback.push(feedbackEntry);
    
    // Limit feedback history size
    if (this.state.userFeedback.length > 1000) {
      this.state.userFeedback = this.state.userFeedback.slice(-1000);
    }
    
    // Update pattern confidence based on feedback
    this.updatePatternConfidence(feedbackEntry);
    
    // Save state
    this.saveState();
  }
  
  /**
   * Update pattern confidence based on user feedback
   */
  private updatePatternConfidence(feedback: FeedbackEntry): void {
    // Find the pattern
    const patternIndex = this.state.knownPatterns.findIndex(p => p.id === feedback.patternId);
    if (patternIndex === -1) return;
    
    const pattern = { ...this.state.knownPatterns[patternIndex] };
    
    // Update based on feedback type
    switch (feedback.feedbackType) {
      case FeedbackType.TRUE_POSITIVE:
        // Pattern correctly identified a threat - increase confidence
        pattern.detectionCount++;
        pattern.confidence = Math.min(
          1.0,
          pattern.confidence + (this.state.adaptationRate * (1 - pattern.confidence))
        );
        break;
        
      case FeedbackType.FALSE_POSITIVE:
        // Pattern incorrectly flagged as threat - decrease confidence
        pattern.falsePositiveCount++;
        pattern.confidence = Math.max(
          0.3, // Don't let confidence drop too low
          pattern.confidence - (this.state.adaptationRate * pattern.confidence)
        );
        break;
        
      case FeedbackType.FALSE_NEGATIVE:
        // Pattern missed a real threat - decrease threshold for this pattern
        pattern.confidence = Math.max(
          0.3,
          pattern.confidence * 0.9
        );
        break;
        
      case FeedbackType.TRUE_NEGATIVE:
        // Pattern correctly did not trigger - slight confidence increase
        pattern.confidence = Math.min(
          1.0,
          pattern.confidence + (0.1 * this.state.adaptationRate)
        );
        break;
    }
    
    // Update last modified date
    pattern.lastUpdated = new Date().toISOString();
    
    // Update pattern
    this.state.knownPatterns[patternIndex] = pattern;
  }
  
  /**
   * Learn new patterns from a batch of activities
   */
  public learnPatternsFromActivities(activities: UserActivity[]): number {
    if (!activities || activities.length < 100) {
      return 0; // Need sufficient data to learn new patterns
    }
    
    // Extract high-risk activities
    const highRiskActivities = activities
      .filter(a => a.riskScore >= 75)
      .slice(0, 200); // Limit to 200 for performance
    
    if (highRiskActivities.length < 10) {
      return 0; // Not enough high-risk data to learn from
    }
    
    // Find common patterns in high-risk activities
    const newPatterns = this.discoverPatterns(highRiskActivities);
    
    // Add new patterns (avoid duplicates)
    let addedCount = 0;
    newPatterns.forEach(newPattern => {
      // Check if similar pattern already exists
      const similarPattern = this.state.knownPatterns.find(p => 
        p.type === newPattern.type && 
        p.indicators.some(i => 
          newPattern.indicators.some(ni => 
            ni.fieldPath === i.fieldPath && ni.condition === i.condition
          )
        )
      );
      
      if (!similarPattern) {
        this.state.knownPatterns.push(newPattern);
        addedCount++;
      }
    });
    
    // Save state if new patterns were added
    if (addedCount > 0) {
      this.saveState();
    }
    
    return addedCount;
  }
  
  /**
   * Discover patterns from high-risk activities
   */
  private discoverPatterns(activities: UserActivity[]): ThreatPattern[] {
    const newPatterns: ThreatPattern[] = [];
    
    // Group activities by type
    const typeGroups: Record<string, UserActivity[]> = {};
    activities.forEach(activity => {
      const type = activity.activityType || activity.activity || 'unknown';
      typeGroups[type] = typeGroups[type] || [];
      typeGroups[type].push(activity);
    });
    
    // For each group with enough activities, try to find patterns
    Object.entries(typeGroups).forEach(([type, acts]) => {
      if (acts.length >= 5) {
        // Analyze common features
        const commonFeatures = this.findCommonFeatures(acts);
        
        // If we found significant features, create a new pattern
        if (commonFeatures.length >= 2) {
          // Create threat indicators from common features
          const indicators = commonFeatures.map(feature => ({
            fieldPath: feature.path,
            condition: feature.type as any,
            value: feature.value,
            weight: feature.significance
          }));
          
          // Determine threat type based on features
          const threatType = this.determineThreatType(type, indicators);
          
          // Create new pattern
          const newPattern: ThreatPattern = {
            id: `learned_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: `Learned pattern for ${type}`,
            type: threatType,
            confidence: 0.65, // Start with moderate confidence
            description: `Automatically learned pattern from high-risk ${type} activities`,
            indicators,
            detectionCount: 0,
            falsePositiveCount: 0,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          
          newPatterns.push(newPattern);
        }
      }
    });
    
    return newPatterns;
  }
  
  /**
   * Find common features across activities that might indicate threats
   */
  private findCommonFeatures(activities: UserActivity[]): Array<{
    path: string;
    type: string;
    value: any;
    significance: number;
  }> {
    const features: Array<{
      path: string;
      type: string;
      value: any;
      significance: number;
    }> = [];
    
    // Common paths to analyze
    const pathsToAnalyze = [
      'riskScore',
      'timestamp',
      'activityType',
      'activity',
      'integration',
      'department',
      'values.fileSize',
      'values.destination',
      'values.accessType',
      'values.location'
    ];
    
    // Analyze each path
    pathsToAnalyze.forEach(path => {
      // Gather values for this path
      const values = activities
        .map(a => this.getNestedValue(a, path))
        .filter(v => v !== undefined);
      
      if (values.length < activities.length * 0.7) {
        return; // Skip if not present in majority of activities
      }
      
      // Analyze based on data type
      if (values.length > 0 && typeof values[0] === 'number') {
        // For numeric values, find thresholds
        const avg = values.reduce((sum, v) => sum + (v as number), 0) / values.length;
        const min = Math.min(...values as number[]);
        const max = Math.max(...values as number[]);
        
        // If there's a significant upper threshold
        if (max > avg * 1.5) {
          features.push({
            path,
            type: 'greater_than',
            value: avg,
            significance: 0.6
          });
        }
        
        // If there's a significant lower threshold
        if (min < avg * 0.5) {
          features.push({
            path,
            type: 'less_than',
            value: avg,
            significance: 0.5
          });
        }
      } else if (values.length > 0 && typeof values[0] === 'string') {
        // For string values, find common values
        const valueCounts: Record<string, number> = {};
        values.forEach(v => {
          valueCounts[v as string] = (valueCounts[v as string] || 0) + 1;
        });
        
        // Find most common value
        const mostCommon = Object.entries(valueCounts)
          .sort(([, a], [, b]) => b - a)[0];
        
        if (mostCommon && mostCommon[1] >= activities.length * 0.6) {
          features.push({
            path,
            type: 'equals',
            value: mostCommon[0],
            significance: mostCommon[1] / activities.length
          });
        }
        
        // If dealing with timestamps, check for time patterns
        if (path === 'timestamp') {
          const hours = values.map(v => new Date(v as string).getHours());
          const outsideBusinessHours = hours.filter(h => h < 8 || h > 18).length;
          
          if (outsideBusinessHours >= activities.length * 0.7) {
            features.push({
              path,
              type: 'time_window',
              value: { outsideHours: true, window: [18, 8] },
              significance: 0.7
            });
          }
        }
      }
    });
    
    // Sort by significance
    return features.sort((a, b) => b.significance - a.significance);
  }
  
  /**
   * Determine the type of threat pattern based on features
   */
  private determineThreatType(activityType: string, indicators: ThreatIndicator[]): ThreatPatternType {
    // Check for specific patterns in indicators
    const hasFileSize = indicators.some(i => i.fieldPath.includes('fileSize'));
    const hasOutsideHours = indicators.some(i => i.condition === 'time_window');
    const hasFailures = indicators.some(i => i.fieldPath.includes('fail') || i.fieldPath.includes('error'));
    
    // Determine type based on indicators and activity type
    if (hasFileSize) {
      return ThreatPatternType.DATA_EXFILTRATION;
    } else if (hasFailures || activityType.includes('login') || activityType.includes('access')) {
      return ThreatPatternType.UNAUTHORIZED_ACCESS;
    } else if (hasOutsideHours) {
      return ThreatPatternType.UNUSUAL_TIMING;
    } else if (activityType.includes('policy') || indicators.some(i => i.fieldPath.includes('policy'))) {
      return ThreatPatternType.POLICY_VIOLATION;
    }
    
    // Default
    return ThreatPatternType.ANOMALOUS_BEHAVIOR;
  }
  
  /**
   * Evaluate all patterns against a set of activities
   */
  public analyzeActivities(activities: UserActivity[]): {
    detectedThreats: Array<{
      activityId: string;
      patterns: Array<{ patternId: string; confidence: number; threatType: ThreatPatternType }>;
    }>;
    summary: {
      totalActivities: number;
      threatsDetected: number;
      threatsByType: Record<ThreatPatternType, number>;
    };
  } {
    const detectedThreats: Array<{
      activityId: string;
      patterns: Array<{ patternId: string; confidence: number; threatType: ThreatPatternType }>;
    }> = [];
    
    const threatsByType: Record<string, number> = Object.values(ThreatPatternType)
      .reduce((acc, type) => ({ ...acc, [type]: 0 }), {} as Record<string, number>);
    
    // Analyze each activity
    activities.forEach(activity => {
      const { matches } = this.analyzeActivity(activity);
      
      if (matches.length > 0) {
        // Record the detection
        detectedThreats.push({
          activityId: activity.id,
          patterns: matches
        });
        
        // Update threat type counts
        matches.forEach(match => {
          threatsByType[match.threatType]++;
        });
      }
    });
    
    // Return analysis results
    return {
      detectedThreats,
      summary: {
        totalActivities: activities.length,
        threatsDetected: detectedThreats.length,
        threatsByType: threatsByType as Record<ThreatPatternType, number>
      }
    };
  }
  
  /**
   * Get all known threat patterns
   */
  public getPatterns(): ThreatPattern[] {
    return this.state.knownPatterns;
  }
  
  /**
   * Add a custom threat pattern
   */
  public addPattern(pattern: Omit<ThreatPattern, 'id' | 'detectionCount' | 'falsePositiveCount' | 'lastUpdated' | 'createdAt'>): ThreatPattern {
    const newPattern: ThreatPattern = {
      ...pattern,
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      detectionCount: 0,
      falsePositiveCount: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    this.state.knownPatterns.push(newPattern);
    this.saveState();
    
    return newPattern;
  }
  
  /**
   * Remove a threat pattern
   */
  public removePattern(patternId: string): boolean {
    const initialLength = this.state.knownPatterns.length;
    this.state.knownPatterns = this.state.knownPatterns.filter(p => p.id !== patternId);
    
    if (this.state.knownPatterns.length !== initialLength) {
      this.saveState();
      return true;
    }
    
    return false;
  }
  
  /**
   * Reset learner to default state
   */
  public reset(): void {
    this.state = {
      knownPatterns: DEFAULT_PATTERNS,
      userFeedback: [],
      lastAnalysisDate: new Date().toISOString(),
      patternMatchThreshold: 0.65,
      adaptationRate: 0.2
    };
    
    this.saveState();
  }
}

export const threatLearner = ThreatLearner.getInstance();

export default threatLearner; 