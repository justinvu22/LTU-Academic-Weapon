export interface PolicyBreach {
  dataLeakage?: string[];
  pii?: string[];
  phi?: string[];
  pci?: string[];
  financial?: string[];
  sensitive?: string[];
  userAtRisk?: string[];
  fraud?: string[];
}

export interface ActivityValues {
  destinations?: string[];
  cloudProvider?: string;
  device?: string;
  application?: string;
}

export interface UserActivity {
  activityId: string;
  user: string;
  date: string;
  time: string;
  riskScore: number;
  integration: 'si-email' | 'si-cloud' | 'si-usb' | 'si-application';
  policiesBreached: PolicyBreach;
  values: ActivityValues;
  status: 'underReview' | 'trusted' | 'concern' | 'nonConcern';
  managerAction?: 'escalated' | 'employeeCounselled' | 'knownGoodActivity';
}

export interface UserActivityStats {
  totalActivities: number;
  averageRiskScore: number;
  riskScoreDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  integrationBreakdown: {
    email: number;
    cloud: number;
    usb: number;
    application: number;
  };
  statusBreakdown: {
    underReview: number;
    trusted: number;
    concern: number;
    nonConcern: number;
  };
  breachCategories: {
    dataLeakage: number;
    pii: number;
    phi: number;
    pci: number;
    financial: number;
    sensitive: number;
    userAtRisk: number;
    fraud: number;
  };
  timeDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
  };
}

export interface ActivityMetrics {
  totalActivities: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  uniqueUsers: number;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface MLRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedUsers: string[];
  suggestedActions: string[];
  timestamp: string;
} 