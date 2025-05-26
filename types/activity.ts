/**
 * Represents a user activity in the system that can be analyzed
 */
export interface UserActivity {
  id: string;
  user?: string;  // Primary user identifier, from 'user' field in CSV
  username?: string; // For backward compatibility
  userId?: string; // Optional for compatibility with schema adapter
  
  // Date and time fields
  date?: string;
  time?: string;
  hour?: number | null; // Hour of day (0-23) extracted from time field
  timestamp?: string;
  
  // Activity details
  activityType?: string; // Primary activity type field
  activity?: string; // For backward compatibility
  description?: string;
  duration?: number;
  
  // Risk assessment
  riskScore?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  isAnomaly?: boolean;
  
  // Additional metadata
  integration?: string;
  values?: Record<string, any>;
  policiesBreached?: Record<string, boolean | string[] | number>;
  department?: string;
  location?: string;
  status?: string;
  deviceId?: string;
  fileType?: string;
  fileSize?: number;
  destination?: string;
  accessType?: string;
  dataVolume?: number;
  
  // Enhanced features for ML insights
  sensitiveData?: boolean;
  dataSource?: string;
  managerAction?: string;
  documentCount?: number;
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
  timestamp?: string;
  category: RecommendationCategory;
  relatedActivities?: string[];
  createdAt?: string;
  deviationFactors?: string[];
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

/**
 * Timeline data point for activity trends over time
 */
export interface TimelineDataPoint {
  date: string;
  low: number;
  medium: number;
  high: number;
  critical: number;
  total: number;
}

// New ML Alert Types
export interface MLAlertItem {
  id: string;
  userId: string;
  userEmail: string;
  mlInsightId: string;
  threatType: string; // "Data Exfiltration", "Suspicious Timing", etc.
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  policiesBreached: string[];
  detectionTime: string;
  riskScore: number;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  description: string;
  detectionFactors: string[];
  suggestedActions: string[];
  timeline: TimelineEvent[];
  mlRecommendation?: MLRecommendation;
  assignedTo?: string;
  managerAction?: ManagerAction;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  riskScore?: number;
  isCritical: boolean;
  activityId?: string;
  policyBreach?: string;
}

export interface ManagerAction {
  action: string;
  comments: string;
  timestamp: string;
  managerId: string;
}

export interface AlertFilters {
  severity: string[];
  status: string[];
  threatType: string[];
  dateRange: [string, string];
  assignedTo: string[];
} 