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
} 