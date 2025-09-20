import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import { MigrationRunner } from '@/lib/migrations';
import { v4 as uuidv4 } from 'uuid';
import { geolocationService } from '@/services/geolocation';
import { tailwindAlgorithm } from '@/services/tailwindAlgorithm';
import { flightEngine } from '@/services/flightEngine';

interface SendMessageRequest {
  title: string;
  content: string;
  locationSharing: 'state' | 'country' | 'anonymous';
  recipient_id?: string; // For replies
  reply_to_message_id?: string; // For conversation threading
}

/**
 * Send a new message or reply
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database and run migrations
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigrations();

    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user!;
    const body: SendMessageRequest = await request.json();

    // Validate input
    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    if (body.title.length > 100) {
      return NextResponse.json(
        { error: 'Title must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (body.content.length > 280) {
      return NextResponse.json(
        { error: 'Content must be 280 characters or less' },
        { status: 400 }
      );
    }

    const db = dbManager.getDatabase();

    // Get sender location
    const senderLocation = await geolocationService.getCurrentLocation();
    if (!senderLocation) {
      return NextResponse.json(
        { error: 'Unable to determine your location' },
        { status: 400 }
      );
    }

    // Apply location sharing preference
    const processedSenderLocation = geolocationService.processLocationForSharing(
      senderLocation,
      body.locationSharing
    );

    let recipientId = body.recipient_id;
    let recipientLocation;

    // If no specific recipient, use Tailwind Algorithm to find random recipient
    if (!recipientId) {
      const eligibleRecipients = await tailwindAlgorithm.findEligibleRecipients(
        user.id,
        senderLocation
      );

      if (eligibleRecipients.length === 0) {
        return NextResponse.json(
          { error: 'No eligible recipients found. Try again later.' },
          { status: 400 }
        );
      }

      const selectedRecipient = tailwindAlgorithm.selectWeightedRecipient(
        eligibleRecipients,
        senderLocation
      );
      recipientId = selectedRecipient.id;
      recipientLocation = selectedRecipient.current_location;
    } else {
      // Get recipient location for direct messages/replies
      const recipientStmt = db.prepare('SELECT current_location FROM users WHERE id = ?');
      const recipient = recipientStmt.get(recipientId) as { current_location: string } | undefined;
      
      if (!recipient) {
        return NextResponse.json(
          { error: 'Recipient not found' },
          { status: 404 }
        );
      }

      recipientLocation = recipient.current_location 
        ? JSON.parse(recipient.current_location)
        : null;
    }

    if (!recipientLocation) {
      return NextResponse.json(
        { error: 'Unable to determine recipient location' },
        { status: 400 }
      );
    }

    // Create message
    const messageId = uuidv4();
    const now = new Date();

    const messageData = {
      id: messageId,
      sender_id: user.id,
      recipient_id: recipientId,
      title: body.title.trim(),
      content: body.content.trim(),
      sender_location: processedSenderLocation,
      recipient_location: recipientLocation,
      status: 'flying' as const,
      created_at: now,
      delivered_at: undefined,
      journey_data: undefined
    };

    // Insert message
    const insertMessageStmt = db.prepare(`
      INSERT INTO messages (
        id, sender_id, recipient_id, title, content,
        sender_location, recipient_location, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const messageRow = dbManager.messageToRow(messageData);
    insertMessageStmt.run(
      messageRow.id,
      messageRow.sender_id,
      messageRow.recipient_id,
      messageRow.title,
      messageRow.content,
      messageRow.sender_location,
      messageRow.recipient_location,
      messageRow.status,
      messageRow.created_at
    );

    // Handle conversation threading
    if (body.reply_to_message_id) {
      await handleConversationThreading(db, messageId, body.reply_to_message_id, user.id, recipientId);
    }

    // Start flight
    await flightEngine.startFlight(messageId);

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        status: 'flying',
        estimated_delivery: 'Flight in progress...'
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleConversationThreading(
  db: any,
  newMessageId: string,
  replyToMessageId: string,
  senderId: string,
  recipientId: string
) {
  // Find existing conversation between these users
  const findConversationStmt = db.prepare(`
    SELECT * FROM conversations 
    WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
  `);
  
  let conversation = findConversationStmt.get(senderId, recipientId, recipientId, senderId);

  if (conversation) {
    // Update existing conversation
    const messageIds = JSON.parse(conversation.message_ids);
    messageIds.push(newMessageId);
    
    const updateConversationStmt = db.prepare(`
      UPDATE conversations 
      SET message_ids = ?, last_message_at = ?
      WHERE id = ?
    `);
    
    updateConversationStmt.run(
      JSON.stringify(messageIds),
      new Date().toISOString(),
      conversation.id
    );
  } else {
    // Create new conversation
    const conversationId = uuidv4();
    const messageIds = [replyToMessageId, newMessageId];
    
    const insertConversationStmt = db.prepare(`
      INSERT INTO conversations (id, user1_id, user2_id, message_ids, created_at, last_message_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    insertConversationStmt.run(
      conversationId,
      senderId,
      recipientId,
      JSON.stringify(messageIds),
      now,
      now
    );
  }
}