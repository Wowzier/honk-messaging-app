import { NextRequest, NextResponse } from 'next/server';
import { flightEngine } from '@/services/flightEngine';
import { LocationData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { messageId, startLocation, endLocation } = await request.json();

    if (!messageId || !startLocation || !endLocation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const flight = await flightEngine.initializeFlight(
      messageId,
      startLocation as LocationData,
      endLocation as LocationData
    );

    if (!flight) {
      return NextResponse.json(
        { error: 'Failed to initialize flight' },
        { status: 500 }
      );
    }

    return NextResponse.json(flight);
  } catch (error) {
    console.error('Error initializing flight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}