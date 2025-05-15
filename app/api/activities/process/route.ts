import { NextResponse } from 'next/server';
import { UserActivity } from '../../../../types/activity';

/**
 * Process activities data and return analytics
 * POST /api/activities/process
 */
export async function POST(request: Request) {
  try {
    const { activities } = await request.json();

    if (!Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty activities data' },
        { status: 400 }
      );
    }

    // Save activities to global for session use
    // @ts-ignore - Using global variable for demo purposes
    global.sessionActivities = activities;

    // Calculate statistics and analytics from activities
    const stats = calculateStatistics(activities);

    return NextResponse.json({
      success: true,
      message: `Processed ${activities.length} activities`,
      activities: activities,
      statistics: stats
    });
  } catch (error) {
    console.error('Error processing activities:', error);
    return NextResponse.json(
      { error: 'Failed to process activities data' },
      { status: 500 }
    );
  }
}

/**
 * Calculate statistics from activity data
 */
function calculateStatistics(activities: UserActivity[]) {
  // Calculate high risk activities
  const highRiskCount = activities.filter(a => a.riskScore >= 70).length;
  
  // Calculate number of policy breaches
  let totalBreachCount = 0;
  const breachCategories: Record<string, number> = {};
  
  activities.forEach(activity => {
    if (activity.policiesBreached) {
      for (const category in activity.policiesBreached) {
        const breaches = activity.policiesBreached[category];
        if (Array.isArray(breaches)) {
          totalBreachCount += breaches.length;
          breachCategories[category] = (breachCategories[category] || 0) + breaches.length;
        } else if (breaches) {
          totalBreachCount += 1;
          breachCategories[category] = (breachCategories[category] || 0) + 1;
        }
      }
    }
  });
  
  return {
    totalActivities: activities.length,
    highRiskActivities: highRiskCount,
    totalPolicyBreaches: totalBreachCount,
    breachCategories,
    averageRiskScore: activities.reduce((sum, a) => sum + a.riskScore, 0) / activities.length
  };
} 