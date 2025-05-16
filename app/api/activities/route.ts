import { NextResponse } from 'next/server';
import { UserActivity } from '../../../types/activity';
import { processActivityData } from '../../../utils/dataProcessor';

/**
 * Parse CSV data into UserActivity objects
 */
function parseCSV(csvData: string): UserActivity[] {
  // Split the CSV into lines
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse data rows
  const rawActivities = lines.slice(1).map((line, index) => {
    const values = line.split(',');
    const activity: Record<string, any> = {
      id: index.toString(),
    };
    
    // Map CSV values to activity properties
    headers.forEach((header, i) => {
      if (i < values.length) {
        // @ts-ignore
        activity[header] = values[i].trim();
      }
    });
    
    return activity;
  });
  
  // Process raw activities using our data processor
  return processActivityData(rawActivities);
}

/**
 * GET handler to retrieve activities
 */
export async function GET() {
  try {
    // @ts-ignore - Using global variable for demo purposes
    const sessionActivities = global.sessionActivities || null;
    
    if (sessionActivities) {
      return NextResponse.json({
        activities: sessionActivities
      });
    }
    
    // Return empty array when no data is available
    return NextResponse.json({
      activities: []
    });
  } catch (error) {
    console.error('Error retrieving activities:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve activities' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to upload and process activities
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    let activities: UserActivity[] = [];
    
    if (data.csv) {
      // Process CSV string
      activities = parseCSV(data.csv);
    } else if (data.activities && Array.isArray(data.activities)) {
      // Use provided activities array but ensure they're properly processed
      activities = processActivityData(data.activities);
    } else {
      return NextResponse.json(
        { error: 'Invalid request: either csv string or activities array required' },
        { status: 400 }
      );
    }
    
    if (activities.length === 0) {
      return NextResponse.json(
        { error: 'No valid activities found in the provided data' },
        { status: 400 }
      );
    }
    
    // Store activities in global variable for session use
    // @ts-ignore - Using global variable for demo purposes
    global.sessionActivities = activities;
    
    return NextResponse.json({
      success: true,
      message: `Processed ${activities.length} activities`,
      totalActivities: activities.length
    });
  } catch (error) {
    console.error('Error processing activities:', error);
    return NextResponse.json(
      { error: 'Failed to process activities data' },
      { status: 500 }
    );
  }
} 