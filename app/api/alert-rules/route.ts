import { NextResponse } from 'next/server';

// Define default alert rules
const defaultAlertRules = [
  {
    id: "1",
    name: "High Login Attempts",
    condition: "login_attempts > threshold in 5 minutes",
    threshold: 5,
    enabled: true,
    severity: "medium",
    notifyVia: ["email", "dashboard"]
  },
  {
    id: "2",
    name: "Critical Data Access",
    condition: "sensitive_data_access = true",
    threshold: 0,
    enabled: true,
    severity: "critical",
    notifyVia: ["email", "sms", "dashboard"]
  },
  {
    id: "3",
    name: "Unusual Time Access",
    condition: "access_time outside normal_hours",
    threshold: 0,
    enabled: false,
    severity: "low",
    notifyVia: ["dashboard"]
  }
];

export async function GET() {
  try {
    // In a real app, this would fetch from a database
    return NextResponse.json(defaultAlertRules, { status: 200 });
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert rules' }, 
      { status: 500 }
    );
  }
} 