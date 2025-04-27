// src/lib/ml/recommendationEngine.js
export class RecommendationEngine {
  constructor() {
    this.recommendationRules = [
      {
        condition: (anomaly) => anomaly.zScores.riskScore > 2.5,
        recommendation: 'Implement additional monitoring for high-risk users',
        explanation: 'Users with significantly elevated risk scores may require closer monitoring',
        severity: 'high',
        category: 'monitoring'
      },
      {
        condition: (anomaly) => 
          anomaly.anomalyFactors.includes('Weekend activity') &&
          anomaly.riskScore > 5,
        recommendation: 'Review and enforce time-based access controls',
        explanation: 'High-risk activities detected outside normal business hours',
        severity: 'medium',
        category: 'access_control'
      },
      {
        condition: (anomaly) => anomaly.policyBreachCount > 2,
        recommendation: 'Provide targeted security training',
        explanation: 'Multiple policy breaches suggest knowledge gaps',
        severity: 'medium',
        category: 'training'
      },
      {
        condition: (anomaly) => 
          anomaly.zScores.combinedRisk > 2 && 
          anomaly.status !== 'addressed',
        recommendation: 'Accelerate review of pending high-risk incidents',
        explanation: 'Several high-risk activities remain unaddressed',
        severity: 'high',
        category: 'incident_response'
      },
      {
        condition: (anomaly) => 
          anomaly.isOffHours && 
          anomaly.policyBreachCount > 0,
        recommendation: 'Review after-hours access policies',
        explanation: 'Policy violations occurring outside business hours',
        severity: 'medium',
        category: 'access_control'
      },
      {
        condition: (anomaly) => {
          if (!anomaly.values || typeof anomaly.values !== 'object') return false;
          const values = Object.values(anomaly.values).flat();
          return values.some(value => 
            typeof value === 'string' && (
              value.toLowerCase().includes('download') || 
              value.toLowerCase().includes('export')
            )
          );
        },
        recommendation: 'Implement data loss prevention controls',
        explanation: 'Unusual data export/download activities detected',
        severity: 'high',
        category: 'data_protection'
      },
      {
        condition: (anomaly) => 
          anomaly.managerAction === 'pending' && 
          anomaly.riskScore > 6,
        recommendation: 'Establish escalation procedures for high-risk activities',
        explanation: 'High-risk activities without manager action',
        severity: 'high',
        category: 'incident_response'
      },
      {
        condition: (anomaly) => 
          anomaly.integration.toLowerCase().includes('cloud') && 
          anomaly.riskScore > 5,
        recommendation: 'Strengthen cloud service security controls',
        explanation: 'High-risk activities in cloud services',
        severity: 'medium',
        category: 'cloud_security'
      },
      {
        condition: (anomaly) => 
          anomaly.anomalyFactors.includes('Activity at unusual time for this user'),
        recommendation: 'Implement user behavior analytics',
        explanation: 'Detected unusual activity patterns for specific users',
        severity: 'medium',
        category: 'monitoring'
      },
      {
        condition: (anomaly) => 
          anomaly.anomalyFactors.includes('Rapid succession of activities'),
        recommendation: 'Review and implement rate limiting',
        explanation: 'Detected unusual frequency of activities',
        severity: 'medium',
        category: 'access_control'
      },
      {
        condition: (anomaly) => 
          anomaly.riskScoreTrend > 0.5,
        recommendation: 'Investigate increasing risk trend',
        explanation: 'Detected upward trend in risk scores',
        severity: 'high',
        category: 'monitoring'
      }
    ];
    
    // Severity weights for prioritization
    this.severityWeights = {
      high: 3,
      medium: 2,
      low: 1
    };
  }
  
  generateRecommendations(anomalies) {
    // Track which recommendations have been triggered
    const recommendationsMap = new Map();
    
    // Check each anomaly against all rules
    anomalies.forEach(anomaly => {
      this.recommendationRules.forEach(rule => {
        if (rule.condition(anomaly)) {
          if (!recommendationsMap.has(rule.recommendation)) {
            recommendationsMap.set(rule.recommendation, {
              recommendation: rule.recommendation,
              explanation: rule.explanation,
              severity: rule.severity,
              category: rule.category,
              examples: [],
              count: 0,
              priorityScore: 0
            });
          }
          
          const recData = recommendationsMap.get(rule.recommendation);
          recData.count++;
          
          // Calculate priority score based on severity and frequency
          recData.priorityScore = this.calculatePriorityScore(recData);
          
          // Add this as an example if we don't have too many already
          if (recData.examples.length < 3) {
            recData.examples.push({
              user: anomaly.user,
              factors: anomaly.anomalyFactors,
              riskScore: anomaly.riskScore,
              timestamp: anomaly.timestamp
            });
          }
        }
      });
    });
    
    // Convert to array and sort by priority score
    return Array.from(recommendationsMap.values())
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }
  
  // Calculate priority score for a recommendation
  calculatePriorityScore(recommendation) {
    const severityWeight = this.severityWeights[recommendation.severity] || 1;
    const frequencyWeight = Math.log(recommendation.count + 1); // Logarithmic scaling
    
    // Additional factors that could influence priority
    const recentExamples = recommendation.examples.filter(
      ex => Date.now() - ex.timestamp < 24 * 60 * 60 * 1000
    ).length;
    
    const recentWeight = recentExamples > 0 ? 1.5 : 1;
    
    return severityWeight * frequencyWeight * recentWeight;
  }
  
  // Add a custom recommendation rule
  addRule(rule) {
    if (!rule.severity) rule.severity = 'medium';
    if (!rule.category) rule.category = 'general';
    this.recommendationRules.push(rule);
  }
  
  // Get recommendations by category
  getRecommendationsByCategory(recommendations) {
    const byCategory = new Map();
    
    recommendations.forEach(rec => {
      if (!byCategory.has(rec.category)) {
        byCategory.set(rec.category, []);
      }
      byCategory.get(rec.category).push(rec);
    });
    
    return byCategory;
  }
  
  // Get recommendations by severity
  getRecommendationsBySeverity(recommendations) {
    const bySeverity = new Map();
    
    recommendations.forEach(rec => {
      if (!bySeverity.has(rec.severity)) {
        bySeverity.set(rec.severity, []);
      }
      bySeverity.get(rec.severity).push(rec);
    });
    
    return bySeverity;
  }
} 