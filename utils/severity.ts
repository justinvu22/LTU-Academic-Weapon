export const SEVERITY_THRESHOLDS = {
  LOW: 1000,
  MEDIUM: 1500,
  HIGH: 2000,
  CRITICAL: 2001,
};

export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Convert a numeric risk score into one of the four severity buckets used across the app.
 */
export function severityFromRisk(score: number = 0): Severity {
  if (score >= SEVERITY_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= SEVERITY_THRESHOLDS.HIGH)     return 'high';
  if (score >= SEVERITY_THRESHOLDS.MEDIUM)   return 'medium';
  return 'low';
} 