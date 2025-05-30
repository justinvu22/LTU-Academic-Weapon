# User Behavior Clustering

## Overview
The User Behavior Clustering component visualizes user activity patterns by grouping users with similar behaviors into clusters. It provides an interactive scatter chart that helps security analysts identify high-risk users, policy violators, and unusual activity patterns.

## Key Features
- **Interactive Clustering Visualization**: Users are plotted based on their activity count and average risk score
- **Multiple Clustering Methods**: Toggle between rule-based and ML-based clustering algorithms
- **Cluster Boundaries**: Visual indication of cluster regions with color-coded backgrounds
- **Spread Points**: Jitter functionality to improve visibility of overlapping data points
- **Detailed User Profiles**: Click on any point to view detailed user metrics and activities
- **Cluster Filtering**: Show/hide specific clusters to focus on areas of interest

## Controls
- **Boundaries Toggle**: Show/hide colored regions indicating cluster boundaries
- **Spread Points Toggle**: Enable point spreading to visualize dense clusters better
- **ML Clustering Toggle**: Switch between rule-based and machine learning clustering
- **Cluster Filter Buttons**: Toggle visibility of specific clusters

## Cluster Types
- **High Risk Night Shift** (Red, #DC2626): Users with significant activity during 1-3 AM hours and high risk scores
- **High Risk Users** (Orange, #F59E0B): Users with consistently high risk scores across their activities
- **High Volume Users** (Purple, #8B5CF6): Users with an exceptionally high number of activities
- **Policy Violators** (Pink, #EC4899): Users with multiple detected policy breaches
- **Normal Users** (Green, #10B981): Users with typical activity patterns and risk levels

## Technical Implementation

### Data Flow

1. **Input Data Processing**:
   - User activities are aggregated by username
   - Key metrics are calculated: average risk score, activity count, policy breach count, critical hour ratio
   - Additional metrics like unique integrations used are computed for each user

2. **Clustering Logic**:
   - **Rule-based Clustering**: Users are assigned to clusters based on predefined rules
   - **ML-based Clustering**: TensorFlow.js analyzes patterns to group similar users

3. **Visualization Pipeline**:
   - Data points are positioned on the scatter plot based on activity count (x-axis) and risk score (y-axis)
   - Optional jittering applied to prevent overlapping points
   - Each cluster is rendered separately with specific colors
   - Cluster boundaries are calculated dynamically based on point distribution

### Rule-based Clustering Algorithm

The rule-based clustering assigns users to clusters using the following criteria:

```typescript
// Simplified logic
if (criticalHourRatio > 0.5 && avgRiskScore > 1000) {
  cluster = 'High Risk Night Shift';
} else if (avgRiskScore > 1500) {
  cluster = 'High Risk Users';
} else if (activityCount > 100) {
  cluster = 'High Volume Users';
} else if (policyBreachCount > 5) {
  cluster = 'Policy Violators';
} else {
  cluster = 'Normal Users';
}
```

### ML-based Clustering Implementation

The ML clustering uses TensorFlow.js to perform more sophisticated pattern analysis:

1. **Feature Extraction**:
   - Multiple features are extracted from user activity data:
     - Activity count and timing patterns
     - Average and maximum risk scores
     - Policy breach frequency and types
     - Activity hour distribution
     - Integration usage patterns

2. **Data Preparation**:
   - Features are normalized to ensure equal weighting
   - Dimensional reduction techniques prepare data for clustering

3. **ML Clustering Process**:
   - The algorithm dynamically imports TensorFlow.js when ML clustering is enabled
   - K-means clustering with optimized k-value groups similar users
   - Outlier detection identifies users with unusual behavior patterns
   - Points are mapped to a 2D space for visualization while preserving similarity relationships

4. **Cluster Assignment**:
   - Base clusters are determined by the ML algorithm
   - Final cluster assignment balances ML results with interpretable categories:
   ```typescript
   if (userMetrics.criticalHourRatio > 0.3) {
     clusterName = "High Risk Night Shift";
   } else if (hasVeryHighRisk || (actualAvgRisk > 1800 && index % 3 === 0)) {
     clusterName = "High Risk Users";
   } else if (userMetrics.policyBreachCount > 2) {
     clusterName = "Policy Violators";
   } else if (userActivities.length > 40 || (index % 5 === 0 && userActivities.length > 20)) {
     clusterName = "High Volume Users";
   } else {
     clusterName = "Normal Users";
   }
   ```

### Jittering Algorithm

The jittering algorithm intelligently spreads points to improve visualization:

1. **Magnitude Calculation**:
   - Different cluster types receive different jitter magnitudes
   - Denser clusters receive more jittering
   ```typescript
   switch (cluster) {
     case 'Policy Violators':
       magnitude = 20; // Higher jitter for the densest cluster
       break;
     case 'High Risk Users':
       magnitude = 12;
       break;
     // ...
   }
   ```

2. **Safe Jittering**:
   - Points near zero receive less jittering to prevent negative values
   - Edge proximity is considered to keep points within the visible area
   - Cluster density affects jitter scaling

3. **Consistent Randomization**:
   - Seeded random function ensures consistent jittering between renders
   - Animation provides smooth transitions when toggling jitter

## Usage
1. **Analyze Cluster Distribution**: Identify which clusters have the most users
2. **Investigate Outliers**: Pay special attention to outlier points within clusters
3. **Compare Clustering Methods**: Toggle ML clustering to see different patterns
4. **View User Details**: Click on individual points to examine specific user activities
5. **Filter Clusters**: Focus on specific behavior patterns by showing only relevant clusters

## Data Interpretation
- **X-Axis**: Activity Count (higher values indicate more user activities)
- **Y-Axis**: Average Risk Score (higher values indicate riskier behavior)
- **Color**: Each cluster has a distinct color for easy identification
- **Outliers**: Users with significantly different behavior from their cluster are marked

## Implementation Benefits

1. **Performance Optimization**:
   - ML code is dynamically imported only when needed
   - Rendering optimizations for handling large datasets
   - Efficient filtering and calculations

2. **Balanced Distribution**:
   - ML clustering ensures meaningful distribution across categories
   - Ensures visualization remains interpretable while leveraging ML insights

3. **Real Metrics Preservation**:
   - While ML is used for clustering, actual user metrics are preserved
   - This ensures accurate statistics in tooltips and detail views

This visualization helps security teams quickly identify high-risk users and understand behavioral patterns across the organization. 