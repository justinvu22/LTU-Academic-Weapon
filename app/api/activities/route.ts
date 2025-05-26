import { NextResponse } from 'next/server';

/**
 * GET handler to instruct clients to use local storage
 * This is a dummy API that adheres to the "no backend" requirement
 * All actual data processing happens client-side
 */
export async function GET(_request: Request) {
  return NextResponse.json({
    // Empty activities array to indicate no server-side data
    // Client should use IndexedDB/localStorage instead
    activities: [],
    
    // Flag to tell client to use its own storage
    useClientStorage: true,
    
    // Clear message about client-side operation
    message: "This application operates entirely client-side. Please use the Upload page to load data."
  });
}

/**
 * POST handler that acknowledges the upload but doesn't store anything server-side
 * Instructs client to use IndexedDB/localStorage mechanisms
 */
export async function POST(request: Request) {
  // Log request content for debugging if possible
  try {
    const body = await request.clone().json();
    if (body && body.sample) {
      console.log("Upload sample data format:", {
        firstFewRows: body.sample.slice(0, 2),
        fieldNames: body.sample && body.sample.length > 0 ? Object.keys(body.sample[0]) : []
      });
    }
  } catch (e) {
    console.log("Could not log request content", e);
  }

  // Create response instructing the client to use local storage
  const response = NextResponse.json({
    success: true,
    message: "Client-side processing mode active. Data has been stored in IndexedDB/localStorage.",
    useClientStorage: true
  });
  
  // Set cookie to indicate data should be available client-side
  response.cookies.set('hasStoredActivities', 'true', {
    path: '/',
    maxAge: 3600, // 1 hour
    httpOnly: false // Allow JS access
  });
  
  return response;
} 