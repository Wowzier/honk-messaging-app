import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import { MigrationRunner } from '@/lib/migrations';
import { v4 as uuidv4 } from 'uuid';
import { geolocationService } from '@/services/geolocation';
import { tailwindAlgorithm } from '@/services/tailwindAlgorithm';
import { flightEngine } from '@/services/flightEngine';
import { calculatePostcardLineCount, POSTCARD_MAX_LINES } from '@/utils/postcard';

interface SendMessageRequest {
  title: string;
  content: string;
  locationSharing: 'state' | 'country' | 'anonymous';
  recipient_id?: string; // For replies
  reply_to_message_id?: string; // For conversation threading
  message_type?: 'regular' | 'postcard';
  sticker_data?: any[]; // Sticker data for postcards
}

/**
 * Send a new message or reply
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database and run migrations
    const database = dbManager.connect();
    const migrationRunner = new MigrationRunner(database);
    migrationRunner.runMigrations();

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

    const lineCount = calculatePostcardLineCount(body.content.trim());
    if (lineCount > POSTCARD_MAX_LINES) {
      return NextResponse.json(
        { error: 'Content must fit within 6 postcard lines' },
        { status: 400 }
      );
    }

    const db = database;

    // Get sender location: prefer client-provided location in the request body.
    // Avoid calling browser geolocation APIs on the server (navigator is undefined).
    let senderLocation: any = (body as any).sender_location;

    if (!senderLocation) {
      try {
        if (typeof geolocationService.isGeolocationSupported === 'function' && geolocationService.isGeolocationSupported()) {
          senderLocation = await geolocationService.getCurrentLocation();
        } else {
          // Server context or not supported: fallback to anonymous/default location
          senderLocation = { latitude: 0, longitude: 0, is_anonymous: true };
        }
      } catch (geoErr) {
        console.warn('Geolocation fetch failed on server, falling back to anonymous location:', geoErr);
        senderLocation = { latitude: 0, longitude: 0, is_anonymous: true };
      }
    }

    // Apply location sharing preference - simplified for now
    const processedSenderLocation = {
      ...senderLocation,
      is_anonymous: body.locationSharing === 'anonymous'
    };

    let recipientId = body.recipient_id;
    let recipientLocation;

    // If no specific recipient, use Tailwind Algorithm to find random recipient
    if (!recipientId) {
      // For postcards without recipient_id, use Tailwind Algorithm
      if (body.message_type === 'postcard') {
        // Use the Tailwind Algorithm for postcards too
        let eligibleRecipients = await tailwindAlgorithm.findEligibleRecipients(
          user.id,
          senderLocation
        );

        // Fallback: if no eligible recipients, get any other user
        if (eligibleRecipients.length === 0) {
          console.log('No eligible recipients from Tailwind Algorithm, falling back to any user');
          const fallbackStmt = db.prepare(`
            SELECT * FROM users 
            WHERE id != ? 
            LIMIT 10
          `);
          
          const fallbackRows = fallbackStmt.all(user.id);
          if (fallbackRows.length === 0) {
            return NextResponse.json(
              { error: 'No other users available in the system. Please try again later.' },
              { status: 400 }
            );
          }
          
          // Pick a random user from available users
          const randomUser = fallbackRows[Math.floor(Math.random() * fallbackRows.length)] as any;
          recipientId = randomUser.id;
          recipientLocation = randomUser.current_location 
            ? JSON.parse(randomUser.current_location) 
            : null;
        } else {
          const selectedRecipient = tailwindAlgorithm.selectWeightedRecipient(
            eligibleRecipients,
            senderLocation
          );
          recipientId = selectedRecipient.id;
          recipientLocation = selectedRecipient.current_location;
        }
      } else {
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
      }
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

    // Ensure we have a recipient
    if (!recipientId) {
      return NextResponse.json(
        { error: 'Unable to find a recipient' },
        { status: 400 }
      );
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
      status: 'flying' as const, // All messages start as flying
      created_at: now,
      delivered_at: undefined, // Will be set when delivered
      journey_data: undefined,
      message_type: body.message_type || 'regular' as const,
      sticker_data: body.sticker_data || []
    };

    // Insert message
    const insertMessageStmt = db.prepare(`
      INSERT INTO messages (
        id, sender_id, recipient_id, title, content,
        sender_location, recipient_location, status, created_at,
        delivered_at, message_type, sticker_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const messageRow = dbManager.messageToRow(messageData);

    // Debug logging to help diagnose server-side errors when inserting messages
    console.log('Sending message - body:', {
      title: body.title,
      contentLength: body.content.length,
      message_type: body.message_type,
      sticker_count: Array.isArray(body.sticker_data) ? body.sticker_data.length : 0,
      recipientId,
      status: messageData.status
    });
    console.log('Transformed messageRow:', messageRow);

    try {
      insertMessageStmt.run(
        messageRow.id,
        messageRow.sender_id,
        messageRow.recipient_id,
        messageRow.title,
        messageRow.content,
        messageRow.sender_location,
        messageRow.recipient_location,
        messageRow.status,
        messageRow.created_at,
        messageRow.delivered_at,
        messageRow.message_type,
        messageRow.sticker_data
      );
    } catch (dbError: any) {
      console.error('Database error when inserting message:', dbError);
      // Return a more descriptive error to the client for debugging (safe for dev)
      return NextResponse.json({ error: 'Database insert failed', details: dbError.message || String(dbError) }, { status: 500 });
    }

    // Handle conversation threading
    if (body.reply_to_message_id) {
      await handleConversationThreading(db, messageId, body.reply_to_message_id, user.id, recipientId);
    }

    // Get recipient username for response
    const recipientStmt = db.prepare('SELECT username FROM users WHERE id = ?');
    const recipient = recipientStmt.get(recipientId) as { username: string } | undefined;

    // Start flight - TODO: Fix flight engine
    // await flightEngine.startFlight(messageId);

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        status: 'flying',
        recipient_username: recipient?.username || 'Someone',
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