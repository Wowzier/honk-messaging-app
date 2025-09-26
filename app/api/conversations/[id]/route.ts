import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import { MigrationRunner } from '@/lib/migrations';

/**
 * Get messages in a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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
    const conversationId = params.id;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const db = dbManager.getDatabase();

    // Verify user has access to this conversation
    const conversationStmt = db.prepare(`
      SELECT * FROM conversations 
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    `);
    
    const conversationRow = conversationStmt.get(conversationId, user.id, user.id);
    if (!conversationRow) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    const conversation = dbManager.rowToConversation(conversationRow);
    const messageIds = conversation.message_ids;

    if (messageIds.length === 0) {
      return NextResponse.json({
        conversation: {
          ...conversation,
          other_participant_id: conversation.user1_id === user.id 
            ? conversation.user2_id 
            : conversation.user1_id
        },
        messages: [],
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

    // Get paginated messages
    const paginatedMessageIds = messageIds.slice(offset, offset + limit);
    const placeholders = paginatedMessageIds.map(() => '?').join(',');
    
    const messagesStmt = db.prepare(`
      SELECT m.*, u.username as sender_username, u.current_rank as sender_rank
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id IN (${placeholders})
      ORDER BY m.created_at ASC
    `);

    const messageRows = messagesStmt.all(...paginatedMessageIds);
    const messages = messageRows.map((row: any) => ({
      ...dbManager.rowToMessage(row),
      sender_username: row.sender_username,
      sender_rank: row.sender_rank
    }));

    // Get other participant info
    const otherParticipantId = conversation.user1_id === user.id 
      ? conversation.user2_id 
      : conversation.user1_id;
    
    const otherParticipantStmt = db.prepare(`
      SELECT username, current_rank FROM users WHERE id = ?
    `);
    const otherParticipant = otherParticipantStmt.get(otherParticipantId);

    const total = messageIds.length;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      conversation: {
        ...conversation,
        other_participant_id: otherParticipantId,
        other_participant_username: otherParticipant?.username,
        other_participant_rank: otherParticipant?.current_rank
      },
      messages,
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
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}