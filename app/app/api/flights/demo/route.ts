import { NextResponse } from 'next/server';
import { flightEngine } from '@/services/flightEngine';

export async function POST(request: Request) {
  try {
    const { messageId, startLocation, endLocation } = await request.json();

    const flightRecord = await flightEngine.initializeFlight(
      messageId,
      startLocation,
      endLocation
    );

    if (!flightRecord) {
      return NextResponse.json({ error: 'Failed to create flight' }, { status: 400 });
    }

    return NextResponse.json(flightRecord);
  } catch (error) {
    console.error('Error creating demo flight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}