import Papa from 'papaparse';

export async function loadActivityData() {
  try {
    const response = await fetch('/data/activity_report.csv');
    const csvText = await response.text();
    
    const results = Papa.parse(csvText, { 
      header: true, 
      dynamicTyping: true,
      skipEmptyLines: true 
    });
    
    if (results.errors && results.errors.length > 0) {
      console.error('CSV parsing errors:', results.errors);
    }
    
    console.log('Loaded', results.data.length, 'activities');
    return results.data;
  } catch (error) {
    console.error('Error loading activity data:', error);
    return [];
  }
}

export function prepareFeatures(activities) {
  // Convert date/time to JavaScript Date objects
  const processedActivities = activities.map(activity => {
    // Create features suitable for anomaly detection
    return {
      ...activity,
      // Convert date and time to a single timestamp
      timestamp: new Date(`${activity.date} ${activity.time}`),
      // Count the number of policies breached
      policyBreachCount: activity.policiesBreached ? 
        activity.policiesBreached.split(',').length : 0,
      // Convert status to numerical value if needed
      statusCode: ['pending', 'reviewed', 'addressed'].indexOf(activity.status.toLowerCase())
    };
  });
  
  // Additional derived features
  return processedActivities.map(activity => {
    // Get hour of day (to detect off-hours activity)
    const hourOfDay = activity.timestamp.getHours();
    // Is this weekend activity?
    const isWeekend = [0, 6].includes(activity.timestamp.getDay());
    // Is this outside normal working hours (9-5)?
    const isOffHours = hourOfDay < 9 || hourOfDay > 17;
    
    return {
      ...activity,
      hourOfDay,
      isWeekend,
      isOffHours,
      // Combined risk factors
      combinedRisk: activity.riskScore * (activity.policyBreachCount + 1)
    };
  });
}

export function analyzeActivityData(activities) {
  // Basic statistics on risk scores
  const riskScores = activities.map(row => row.riskScore).filter(score => !isNaN(score));
  const avgRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
  const maxRisk = Math.max(...riskScores);
  const minRisk = Math.min(...riskScores);
  
  // Count of policies breached
  const policiesBreachedCount = {};
  activities.forEach(row => {
    if (row.policiesBreached) {
      const policies = row.policiesBreached.split(',');
      policies.forEach(policy => {
        const policyTrimmed = policy.trim();
        policiesBreachedCount[policyTrimmed] = (policiesBreachedCount[policyTrimmed] || 0) + 1;
      });
    }
  });
  
  // Activity by user
  const userActivity = {};
  activities.forEach(row => {
    userActivity[row.user] = (userActivity[row.user] || 0) + 1;
  });
  
  return {
    totalActivities: activities.length,
    riskStats: { avgRisk, minRisk, maxRisk },
    policiesBreached: policiesBreachedCount,
    userActivity
  };
} 