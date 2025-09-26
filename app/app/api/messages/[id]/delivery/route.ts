import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { messageDeliveryService } from '@/services/messageDelivery';
import { flightEngine } from '@/services/flightEngine';

/**
 * GET /api/messages/[id]/delivery
 * Get delivery status for a message
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const messageId = params.id;
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const db = dbManager.getDatabase();
    
    // Get message details
    const messageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    
    if (!messageRow) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const message = dbManager.rowToMessage(messageRow);
    
    // Get delivery attempt status if pending
    const deliveryStatus = messageDeliveryService.getDeliveryStatus(messageId);
    
    // Get flight progress
    const flightProgress = flightEngine.getFlightProgress(messageId);
    
    return NextResponse.json({
      messageId,
      status: message.status,
      deliveredAt: message.delivered_at,
      deliveryAttempts: deliveryStatus ? {
        attemptCount: deliveryStatus.attemptCount,
        lastAttempt: deliveryStatus.lastAttempt,
        nextRetry: deliveryStatus.nextRetry,
        error: deliveryStatus.error
      } : null,
      flightProgress
    });

  } catch (error) {
    console.error('Error getting delivery status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/[id]/delivery
 * Manually trigger delivery for a completed flight
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const messageId = params.id;
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const db = dbManager.getDatabase();
    
    // Get message details
    const messageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    
    if (!messageRow) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const message = dbManager.rowToMessage(messageRow);
    
    // Check if message is already delivered
    if (message.status === 'delivered') {
      return NextResponse.json(
        { error: 'Message already delivered' },
        { status: 400 }
      );
    }

    // Get flight progress to check if flight is complete
    const flightProgress = flightEngine.getFlightProgress(messageId);
    
    if (!flightProgress || flightProgress.progress_percentage < 100) {
      return NextResponse.json(
        { error: 'Flight not yet complete' },
        { status: 400 }
      );
    }

    // Trigger delivery
    await messageDeliveryService.handleFlightCompletion(messageId, flightProgress);
    
    return NextResponse.json({
      success: true,
      message: 'Delivery triggered successfully'
    });

  } catch (error) {
    console.error('Error triggering delivery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/[id]/delivery
 * Cancel pending delivery retries
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const messageId = params.id;
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const cancelled = messageDeliveryService.cancelDeliveryRetries(messageId);
    
    return NextResponse.json({
      success: true,
      cancelled,
      message: cancelled ? 'Delivery retries cancelled' : 'No pending retries found'
    });

  } catch (error) {
    console.error('Error cancelling delivery retries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}