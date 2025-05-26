import { NextResponse } from 'next/server';

/**
 * Client-side only processor
 * This endpoint is a dummy that instructs the client to use local processing
 * instead of server-side processing
 */
export async function POST(_request: Request) {
  // Simply respond with a message to use client-side processing
  return NextResponse.json({
    success: true,
    message: 'All processing must be performed client-side. Please use the ML worker in the browser.',
    useClientProcessing: true
  });
} 