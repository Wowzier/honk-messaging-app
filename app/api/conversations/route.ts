import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import { MigrationRunner } from '@/lib/migrations';

/**
 * Get user's conversations
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const db = dbManager.getDatabase();

    // Get conversations for the user
    const conversationsStmt = db.prepare(`
      SELECT 
        c.*,
        u1.username as user1_username,
        u2.username as user2_username,
        (
          SELECT COUNT(*) 
          FROM conversations 
          WHERE user1_id = ? OR user2_id = ?
        ) as total
      FROM conversations c
      LEFT JOIN users u1 ON c.user1_id = u1.id
      LEFT JOIN users u2 ON c.user2_id = u2.id
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = conversationsStmt.all(user.id, user.id, user.id, user.id, limit, offset);
    
    if (rows.length === 0) {
      return NextResponse.json({
        conversations: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    const total = (rows[0] as any).total || 0;
    const totalPages = Math.ceil(total / limit);

    // Transform conversations and get latest message for each
    const conversations = await Promise.all(
      rows.map(async (row: any) => {
        const conversation = dbManager.rowToConversation(row);
        const messageIds = conversation.message_ids;
        
        // Get the latest message
        let latestMessage = null;
        if (messageIds.length > 0) {
          const latestMessageId = messageIds[messageIds.length - 1];
          const messageStmt = db.prepare(`
            SELECT m.*, u.username as sender_username
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
          `);
          const messageRow = messageStmt.get(latestMessageId);
          if (messageRow) {
            latestMessage = {
              ...dbManager.rowToMessage(messageRow),
              sender_username: (messageRow as any).sender_username
            };
          }
        }

        // Determine the other participant
        const otherParticipantId = conversation.user1_id === user.id 
          ? conversation.user2_id 
          : conversation.user1_id;
        
        const otherParticipantUsername = conversation.user1_id === user.id
          ? row.user2_username
          : row.user1_username;

        return {
          ...conversation,
          other_participant_id: otherParticipantId,
          other_participant_username: otherParticipantUsername,
          latest_message: latestMessage,
          message_count: messageIds.length
        };
      })
    );

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}