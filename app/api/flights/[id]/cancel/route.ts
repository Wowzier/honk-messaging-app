import { NextRequest, NextResponse } from 'next/server';
import { flightEngine } from '@/services/flightEngine';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id;
    const success = flightEngine.cancelFlight(messageId);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error canceling flight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}