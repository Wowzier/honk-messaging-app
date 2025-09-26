import { NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { messageDeliveryService } from '@/services/messageDelivery';
import { flightEngine } from '@/services/flightEngine';

export async function POST(request: Request) {
  try {
    const { messageId, flightProgress } = await request.json();
    
    // Get message details
    const db = dbManager.getDatabase();
    const messageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

    if (!messageRow) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = dbManager.rowToMessage(messageRow);

    // If message is already delivered, return success
    if (message.status === 'delivered') {
      return NextResponse.json({ success: true });
    }

    // Update message status
    const updateResult = db.prepare(`
      UPDATE messages 
      SET status = 'delivered', delivered_at = ?
      WHERE id = ? AND status = 'flying'
    `).run(new Date().toISOString(), messageId);

    if (updateResult.changes === 0) {
      return NextResponse.json({ error: 'Failed to update message status' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling delivery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const progress = flightEngine.getFlightProgress(messageId);
    return NextResponse.json(progress || { error: 'Flight not found' });
  } catch (error) {
    console.error('Error getting flight progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}