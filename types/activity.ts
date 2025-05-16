/**
 * Represents a user activity in the system that can be analyzed
 */
export interface UserActivity {
  id: string;
  userId: string;
  username: string;
  user?: string;  // For backward compatibility with datasets that use 'user' instead of 'username'
  timestamp: string;
  time?: string;
  date?: string;
  integration: string;
  activity: string;
  status: string;
  riskScore: number;
  values: Record<string, any>;
  policiesBreached: Record<string, any>;
  department?: string;
  location?: string;
  deviceId?: string;
  fileType?: string;
  fileSize?: number;
  destination?: string;
  accessType?: string;
  dataVolume?: number;
  isAnomaly?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Represents a policy breach
 */
export interface PolicyBreach {
  category: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description?: string;
}

/**
 * Represents policy breach icon information
 */
export interface PolicyIcon {
  icon: React.ReactNode;
  label: string;
  color: string;
}

/**
 * Represents statistics calculated from user activities
 */
export interface ActivityStatistics {
  totalActivities: number;
  highRiskActivities: number;
  totalPolicyBreaches: number;
  breachCategories: Record<string, number>;
  averageRiskScore: number;
  usersAtRisk: number;
  topRiskUsers: string[];
  timeDistribution: TimeDistribution;
  integrationDistribution: Record<string, number>;
}

/**
 * Distribution of activities by time of day
 */
export interface TimeDistribution {
  morning: number;  // 6:00 AM - 11:59 AM
  afternoon: number; // 12:00 PM - 5:59 PM
  evening: number;   // 6:00 PM - 11:59 PM
  night: number;     // 12:00 AM - 5:59 AM
}

/**
 * Machine Learning recommendation 
 */
export interface MLRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  affectedUsers: string[];
  suggestedActions: string[];
  timestamp: string;
  category: RecommendationCategory;
  relatedActivities?: string[];
}

/**
 * Types of ML recommendation categories
 */
export type RecommendationCategory = 
  | 'data_exfiltration'
  | 'unusual_behavior'
  | 'policy_breach'
  | 'access_violation'
  | 'suspicious_timing'
  | 'bulk_operations'
  | 'high_risk_sequence';

/**
 * CSV Processing Result
 */
export interface CSVProcessingResult {
  activities: UserActivity[];
  statistics: ActivityStatistics;
  recommendations: MLRecommendation[];
  processingTime: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Filters for activity data
 */
export interface ActivityFilters {
  dateRange?: [Date, Date];
  users?: string[];
  integrations?: string[];
  riskLevel?: ('low' | 'medium' | 'high' | 'critical')[];
  policyTypes?: string[];
  departments?: string[];
  status?: string[];
}

/**
 * Chart data point for visualization
 */
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  extra?: Record<string, any>;
} 