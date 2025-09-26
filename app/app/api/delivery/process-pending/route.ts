import { NextRequest, NextResponse } from 'next/server';
import { messageDeliveryService } from '@/services/messageDelivery';

/**
 * POST /api/delivery/process-pending
 * Process all pending deliveries (useful for system recovery)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get pending deliveries before processing
    const pendingBefore = messageDeliveryService.getPendingDeliveries();
    
    // Process pending deliveries
    await messageDeliveryService.processPendingDeliveries();
    
    // Get pending deliveries after processing
    const pendingAfter = messageDeliveryService.getPendingDeliveries();
    
    return NextResponse.json({
      success: true,
      processed: pendingBefore.length - pendingAfter.length,
      stillPending: pendingAfter.length,
      pendingDeliveries: pendingAfter.map(delivery => ({
        messageId: delivery.messageId,
        attemptCount: delivery.attemptCount,
        nextRetry: delivery.nextRetry
      }))
    });

  } catch (error) {
    console.error('Error processing pending deliveries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/process-pending
 * Get status of pending deliveries
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const pendingDeliveries = messageDeliveryService.getPendingDeliveries();
    
    return NextResponse.json({
      count: pendingDeliveries.length,
      deliveries: pendingDeliveries.map(delivery => ({
        messageId: delivery.messageId,
        attemptCount: delivery.attemptCount,
        lastAttempt: delivery.lastAttempt,
        nextRetry: delivery.nextRetry,
        error: delivery.error
      }))
    });

  } catch (error) {
    console.error('Error getting pending deliveries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}