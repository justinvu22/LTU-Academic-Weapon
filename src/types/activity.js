// src/types/activity.js
/**
 * @typedef {Object} RawActivity
 * @property {string} activityId - Unique identifier for the activity
 * @property {string} user - User who performed the activity
 * @property {string} date - Date of the activity
 * @property {string} time - Time of the activity
 * @property {number} riskScore - Risk score associated with the activity
 * @property {string} integration - Integration or system where activity occurred
 * @property {string} policiesBreached - Comma-separated list of breached policies
 * @property {string} values - Activity values or parameters
 * @property {string} status - Current status of the activity
 * @property {string} managerAction - Manager's action on the activity
 */

/**
 * @typedef {Object} ProcessedActivity
 * @property {string} activityId - Unique identifier for the activity
 * @property {string} user - User who performed the activity
 * @property {string} date - Date of the activity
 * @property {string} time - Time of the activity
 * @property {number} riskScore - Risk score associated with the activity
 * @property {string} integration - Integration or system where activity occurred
 * @property {string} policiesBreached - Comma-separated list of breached policies
 * @property {string} values - Activity values or parameters
 * @property {string} status - Current status of the activity
 * @property {string} managerAction - Manager's action on the activity
 * @property {Date} timestamp - Combined date and time
 * @property {number} policyBreachCount - Number of policies breached
 * @property {number} statusCode - Numerical representation of status
 * @property {number} hourOfDay - Hour of the day (0-23)
 * @property {boolean} isWeekend - Whether activity occurred on weekend
 * @property {boolean} isOffHours - Whether activity occurred outside business hours
 * @property {number} combinedRisk - Combined risk score calculation
 */

/**
 * @typedef {Object} AnomalyResult
 * @property {string} activityId - Unique identifier for the activity
 * @property {string} user - User who performed the activity
 * @property {string} date - Date of the activity
 * @property {string} time - Time of the activity
 * @property {number} riskScore - Risk score associated with the activity
 * @property {string} integration - Integration or system where activity occurred
 * @property {string} policiesBreached - Comma-separated list of breached policies
 * @property {string} values - Activity values or parameters
 * @property {string} status - Current status of the activity
 * @property {string} managerAction - Manager's action on the activity
 * @property {Date} timestamp - Combined date and time
 * @property {number} policyBreachCount - Number of policies breached
 * @property {number} statusCode - Numerical representation of status
 * @property {number} hourOfDay - Hour of the day (0-23)
 * @property {boolean} isWeekend - Whether activity occurred on weekend
 * @property {boolean} isOffHours - Whether activity occurred outside business hours
 * @property {number} combinedRisk - Combined risk score calculation
 * @property {number} anomalyScore - Score indicating how anomalous the activity is
 * @property {Object.<string, number>} zScores - Z-scores for different features
 * @property {boolean} isAnomaly - Whether the activity is considered an anomaly
 * @property {string[]} anomalyFactors - Factors contributing to anomaly detection
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} recommendation - The recommendation text
 * @property {string} explanation - Explanation of the recommendation
 * @property {Array<{user: string, factors: string[], riskScore: number}>} examples - Example cases
 * @property {number} count - Number of times this recommendation was triggered
 */

/**
 * @typedef {Object} MLAnalysisResult
 * @property {AnomalyResult[]} anomalies - List of detected anomalies
 * @property {Recommendation[]} recommendations - List of generated recommendations
 * @property {Object} stats - Analysis statistics
 * @property {number} stats.totalActivities - Total number of activities analyzed
 * @property {number} stats.anomalyCount - Number of anomalies detected
 * @property {number} stats.recommendationCount - Number of recommendations generated
 */ 