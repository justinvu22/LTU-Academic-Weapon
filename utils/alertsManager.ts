import { MLAlertItem, MLRecommendation, TimelineEvent } from '../types/activity';

// Local storage key for alerts
const ALERTS_STORAGE_KEY = 'ml_security_alerts';

export class AlertsManager {
  
  // Create an alert from an ML recommendation
  static createAlert(recommendation: MLRecommendation): MLAlertItem {
    const now = new Date().toISOString();
    const primaryUser = recommendation.affectedUsers[0] || 'unknown';
    
    // Generate timeline from recommendation data
    const timeline: TimelineEvent[] = [
      {
        id: `timeline-${Date.now()}-1`,
        timestamp: now,
        title: 'ML Detection Triggered',
        description: `Anomaly detected: ${recommendation.title}`,
        isCritical: recommendation.severity === 'critical' || recommendation.severity === 'high',
        riskScore: this.calculateRiskScore(recommendation)
      }
    ];

    // Add detection factors as timeline events
    if (recommendation.deviationFactors) {
      recommendation.deviationFactors.slice(0, 3).forEach((factor, index) => {
        timeline.push({
          id: `timeline-${Date.now()}-${index + 2}`,
          timestamp: now,
          title: 'Detection Factor',
          description: factor,
          isCritical: false
        });
      });
    }

    // Generate proper email from user field
    let userEmail = primaryUser;

    const alert: MLAlertItem = {
      id: `ML-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: primaryUser,
      userEmail: userEmail,
      mlInsightId: recommendation.id,
      threatType: this.getCategoryDisplayName(recommendation.category),
      severity: recommendation.severity,
      confidence: recommendation.confidence,
      policiesBreached: this.extractPoliciesFromRecommendation(recommendation),
      detectionTime: now,
      riskScore: this.calculateRiskScore(recommendation),
      status: 'pending',
      description: recommendation.description,
      detectionFactors: recommendation.deviationFactors || [],
      suggestedActions: recommendation.suggestedActions,
      timeline,
      mlRecommendation: recommendation
    };

    return alert;
  }

  // Save alert to local storage
  static saveAlert(alert: MLAlertItem): void {
    try {
      const existingAlerts = this.getAlerts();
      const updatedAlerts = [...existingAlerts, alert];
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updatedAlerts));
      console.log('Alert saved:', alert.id);
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  }

  // Get all alerts from local storage
  static getAlerts(): MLAlertItem[] {
    try {
      const alertsJson = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (alertsJson) {
        return JSON.parse(alertsJson);
      }
      return [];
    } catch (error) {
      console.error('Error loading alerts:', error);
      return [];
    }
  }

  // Update an existing alert
  static updateAlert(alertId: string, updates: Partial<MLAlertItem>): void {
    try {
      const alerts = this.getAlerts();
      const alertIndex = alerts.findIndex(alert => alert.id === alertId);
      
      if (alertIndex !== -1) {
        alerts[alertIndex] = { ...alerts[alertIndex], ...updates };
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
        console.log('Alert updated:', alertId);
      }
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  }

  // Mark alert as reviewed
  static markAsReviewing(alertId: string): void {
    this.updateAlert(alertId, { 
      status: 'reviewing',
      assignedTo: 'current_manager' // You might want to get actual manager ID
    });
  }

  // Assign alert to manager
  static assignToMe(alertId: string, managerId: string = 'current_manager'): void {
    this.updateAlert(alertId, { assignedTo: managerId });
  }

  // Submit manager action
  static submitManagerAction(alertId: string, action: string, comments: string): void {
    const managerAction = {
      action,
      comments,
      timestamp: new Date().toISOString(),
      managerId: 'current_manager' // You might want to get actual manager ID
    };

    const newStatus = action === 'dismissed' ? 'dismissed' : 'resolved';
    
    this.updateAlert(alertId, { 
      managerAction,
      status: newStatus
    });
  }

  // Add method to clear all alerts
  static clearAllAlerts(): void {
    try {
      localStorage.removeItem(ALERTS_STORAGE_KEY);
      console.log('All alerts cleared');
      
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('alertsCleared', { 
        detail: { timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Error clearing alerts:', error);
    }
  }

  // Add method to refresh alerts from new ML recommendations
  static refreshAlertsFromRecommendations(recommendations: MLRecommendation[]): MLAlertItem[] {
    // Clear existing alerts first
    this.clearAllAlerts();
    
    // Process new recommendations
    return this.processRecommendationsIntoAlerts(recommendations);
  }

  // Add method to get alerts by detection time
  static getRecentAlerts(afterTimestamp?: string): MLAlertItem[] {
    const alerts = this.getAlerts();
    
    if (!afterTimestamp) {
      return alerts;
    }
    
    return alerts.filter(alert => 
      new Date(alert.detectionTime) > new Date(afterTimestamp)
    );
  }

  // Get category display name
  static getCategoryDisplayName(category: string): string {
    switch (category) {
      case 'data_exfiltration': return 'Data Exfiltration';
      case 'unusual_behavior': return 'Unusual Behavior';
      case 'policy_breach': return 'Policy Breach';
      case 'access_violation': return 'Access Violation';
      case 'suspicious_timing': return 'Suspicious Timing';
      case 'bulk_operations': return 'Bulk Operations';
      case 'high_risk_sequence': return 'High Risk Sequence';
      default: return 'Security Anomaly';
    }
  }

  // Extract policies from recommendation
  static extractPoliciesFromRecommendation(recommendation: MLRecommendation): string[] {
    const policies: string[] = [];
    
    // Get text to analyze (description + category + title)
    const analysisText = [
      recommendation.description,
      recommendation.title,
      recommendation.category
    ].join(' ').toLowerCase();
    
    // Category-based policy mapping
    switch (recommendation.category) {
      case 'data_exfiltration':
        policies.push('Data Leakage Prevention');
        break;
      case 'access_violation':
        policies.push('Access Control Policy');
        break;
      case 'suspicious_timing':
        policies.push('After Hours Access Policy');
        break;
      case 'bulk_operations':
        policies.push('Bulk Operations Policy');
        break;
      case 'policy_breach':
        policies.push('General Security Policy');
        break;
      case 'unusual_behavior':
        policies.push('Behavioral Security Policy');
        break;
    }
    
    // Enhanced keyword-based detection
    const policyKeywords = {
      'Data Leakage Prevention': ['data leak', 'exfiltration', 'data export', 'sensitive data', 'confidential'],
      'USB Device Policy': ['usb', 'external device', 'removable media', 'flash drive'],
      'After Hours Access Policy': ['after hours', 'out of hours', 'critical hours', '1:00', '2:00', '3:00', 'late night'],
      'Bulk Operations Policy': ['bulk', 'mass', 'large volume', 'excessive activity', 'unusual volume'],
      'Access Control Policy': ['unauthorized', 'access violation', 'privilege', 'permissions'],
      'Email Security Policy': ['email', 'phishing', 'attachment', 'spam'],
      'Web Security Policy': ['web', 'download', 'malicious', 'suspicious site'],
      'File Security Policy': ['file', 'document', 'download', 'upload', 'transfer']
    };
    
    // Check for keyword matches
    Object.entries(policyKeywords).forEach(([policy, keywords]) => {
      if (keywords.some(keyword => analysisText.includes(keyword))) {
        if (!policies.includes(policy)) {
          policies.push(policy);
        }
      }
    });
    
    // If severity is high/critical and no specific policies found, add general policy
    if (policies.length === 0 && (recommendation.severity === 'high' || recommendation.severity === 'critical')) {
      policies.push('Security Monitoring Policy');
    }
    
    return policies;
  }

  // Filter alerts based on criteria
  static filterAlerts(alerts: MLAlertItem[], filters: {
    severity?: string[];
    status?: string[];
    threatType?: string[];
  }): MLAlertItem[] {
    return alerts.filter(alert => {
      if (filters.severity && filters.severity.length > 0) {
        if (!filters.severity.includes(alert.severity)) return false;
      }
      
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(alert.status)) return false;
      }
      
      if (filters.threatType && filters.threatType.length > 0) {
        if (!filters.threatType.includes(alert.threatType)) return false;
      }
      
      return true;
    });
  }

  // Notify managers for critical alerts (placeholder)
  static notifyManagers(alert: MLAlertItem): void {
    console.log(`High priority alert notification: ${alert.id} - ${alert.threatType}`);
    // In a real application, this would send notifications via email, Slack, etc.
  }

  // Process ML recommendations and create alerts
  static processRecommendationsIntoAlerts(recommendations: MLRecommendation[]): MLAlertItem[] {
    const alerts: MLAlertItem[] = [];
    
    recommendations.forEach(recommendation => {
      const alert = this.createAlert(recommendation);
      this.saveAlert(alert);
      alerts.push(alert);
      
      // Notify for high priority alerts
      if (alert.severity === 'critical' || alert.severity === 'high') {
        this.notifyManagers(alert);
      }
    });
    
    return alerts;
  }

  // Calculate risk score based on recommendation severity and confidence
  static calculateRiskScore(recommendation: MLRecommendation): number {
    const baseScores = {
      low: 300,
      medium: 800,
      high: 1500,
      critical: 2500
    };
    
    const baseScore = baseScores[recommendation.severity] || 500;
    const confidenceMultiplier = recommendation.confidence;
    
    return Math.round(baseScore * confidenceMultiplier);
  }
} 