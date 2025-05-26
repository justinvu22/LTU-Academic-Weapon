# Technical Documentation: Charts, Analytics, and ML Components

## Table of Contents
1. [Charts and Visualizations](#charts-and-visualizations)
2. [Advanced Analytics](#advanced-analytics)
3. [Machine Learning Components](#machine-learning-components)
4. [Data Processing Pipeline](#data-processing-pipeline)

## Charts and Visualizations

### Severity Trend Charts
The system implements adaptive severity trend charts that dynamically adjust to the data's time period:

#### Key Features
- **Adaptive Time Range**: Automatically detects and adapts to the actual time period of uploaded data
- **Smart Window Calculation**:
  - Minimum: 7 days (ensures readable visualization)
  - Maximum: 90 days (prevents performance issues)
  - Adaptive: Uses actual data span when reasonable
- **Severity Categories**:
  - Critical: ≥ 2001
  - High: 1500-2000
  - Medium: 1000-1499
  - Low: < 1000

#### Implementation Details
- Located in `app/dashboard/page.tsx` and `components/ActivityCharts.tsx`
- Uses centralized helper function `getDataTimeRange()` for consistent date handling
- Implements robust date parsing for multiple formats
- Optimized performance with efficient data structures

## Advanced Analytics

### Data Processing
The system employs sophisticated data processing techniques:

1. **Activity Status Classification**:
   - `underReview`: Activities pending assessment
   - `concern`: Identified concerning activities
   - `trusted`: Verified legitimate activities
   - `nonConcern`: Activities determined not to pose a risk

2. **Manager Action Integration**:
   - Tracks various action types (escalated, employeeCounselled, etc.)
   - Implements semantic normalization for consistent categorization
   - Uses multi-signal correlation for enhanced accuracy

3. **Performance Metrics**:
   - False positive/negative rate tracking
   - Recommendation precision and recall
   - Learning efficiency measurements
   - Operational impact assessment

## Machine Learning Components

### Rule-Based ML Implementation
The system implements a sophisticated rule-based machine learning approach that combines traditional rule-based detection with statistical analysis and pattern recognition:

#### Core Components

1. **Anomaly Detection System** (`ml/anomalyDetector.ts`):
   - **Rule-Based Thresholds**:
     - Low: 0.6
     - Medium: 0.75
     - High: 0.9
   - **Detection Features**:
     - Time pattern analysis
     - Data volume analysis
     - User behavior analysis
     - Activity sequence analysis
     - Temporal burst detection
     - Integration pattern analysis

2. **Recommendation Engine** (`ml/recommendationEngine.ts`):
   - **Pattern Detectors**:
     - Activity pattern detection
     - Unusual time pattern detection
     - Sensitive data access detection
     - Failed access attempt detection
     - Multi-location access detection
     - Unusual application usage detection
     - Account sharing detection
     - Sequential behavior detection
     - High volume activity detection
     - Frequency anomaly detection
     - Data volume anomaly detection
     - Integration anomaly detection

#### Rule-Based Analysis Process

1. **Baseline Establishment**:
   ```typescript
   // Example of baseline building
   buildBaselines(activities: UserActivity[]): void {
     // First pass: collect data points
     activities.forEach(activity => {
       this.updateGlobalBaseline(activity);
       this.updateUserBaseline(activity);
     });
     
     // Second pass: calculate statistics
     this.finalizeBaselines();
   }
   ```

2. **Pattern Detection Rules**:
   - **Time-Based Rules**:
     - Unusual hours (10 PM - 6 AM)
     - Critical hours (1 AM - 3 AM)
     - Temporal burst detection
   - **Volume-Based Rules**:
     - Data volume thresholds
     - Activity frequency thresholds
     - Burst detection multipliers
   - **Behavior-Based Rules**:
     - Sequential pattern detection
     - Location-based rules
     - Application usage patterns

3. **Confidence Scoring**:
   ```typescript
   // Example of confidence calculation
   calculateConfidence(score: number, threshold: number, factors: string[]): number {
     const baseConfidence = score / threshold;
     const factorBonus = factors.length * 0.1;
     return Math.min(baseConfidence + factorBonus, 1.0);
   }
   ```

#### Integration with Traditional ML

1. **Statistical Analysis**:
   - Z-score calculations for volume anomalies
   - Standard deviation-based thresholds
   - Moving averages for trend detection

2. **Pattern Recognition**:
   - User behavior profiling
   - Activity sequence analysis
   - Integration pattern detection

3. **Adaptive Thresholds**:
   ```typescript
   // Example of adaptive threshold calculation
   getAdaptiveThreshold(activity: UserActivity): number {
     const baseThreshold = this.config.lowThreshold;
     const userBaseline = this.userBaselines.get(activity.userId);
     
     if (userBaseline) {
       const riskHistory = userBaseline.riskScoreHistory;
       const avgRisk = riskHistory.reduce((a, b) => a + b, 0) / riskHistory.length;
       return baseThreshold * (1 + avgRisk);
     }
     
     return baseThreshold;
   }
   ```

### ML Enhancement Features

1. **Supervised Learning Integration**:
   - Uses `concern` activities as positive training examples
   - Uses `trusted` and `nonConcern` as negative examples
   - Implements robust classification system

2. **Confidence Score System**:
   - Dynamic confidence adjustment based on pattern matching
   - Historical accuracy consideration
   - Status distribution-based scaling

3. **Feedback Loop System**:
   - Continuous model updates based on new classifications
   - Active learning for ambiguous cases
   - Performance tracking over time

### Technical Implementation

1. **Data Preprocessing**:
   - Status and manager action filtering
   - Label normalization
   - Weighted training dataset creation
   - Activity sanitization and validation

2. **ML Pipeline**:
   - Extended `RecommendationEngine` integration
   - Confidence adjustment mechanisms
   - Performance tracking systems
   - Real-time anomaly detection

3. **Algorithm Features**:
   - Ensemble methods for multiple signal combination
   - Bias detection and correction
   - Active learning prioritization
   - Rule-based pattern matching

## Data Processing Pipeline

### 1. Data Collection
- User activity data from IndexedDB
- Manager actions and status updates
- Historical classification data

### 2. Preprocessing
- Date normalization
- Status classification
- Action categorization

### 3. Analysis
- Pattern recognition
- Anomaly detection
- Recommendation generation

### 4. Visualization
- Adaptive chart generation
- Severity trend analysis
- Performance metrics display

## Performance Considerations

1. **Optimization Techniques**:
   - Efficient date mapping using Map data structure
   - Single-pass activity processing
   - Optimized sorting algorithms
   - Caching mechanisms

2. **Resource Management**:
   - Tiered processing for large datasets
   - Selective computation for complex operations
   - Memory-efficient data structures

## Security and Privacy

1. **Data Protection**:
   - Strong anonymization techniques
   - Purpose limitation implementation
   - Secure data handling protocols

2. **Bias Management**:
   - Systematic bias detection
   - Fairness algorithm implementation
   - Equal treatment across departments/roles

## Future Enhancements

1. **Planned Improvements**:
   - Enhanced pattern recognition
   - Advanced anomaly detection
   - Improved recommendation accuracy
   - Extended visualization capabilities

2. **Research Areas**:
   - Deep learning integration
   - Real-time processing optimization
   - Advanced visualization techniques
   - Enhanced user feedback systems 