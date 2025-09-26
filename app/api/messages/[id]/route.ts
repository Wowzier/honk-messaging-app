import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const messageId = params.id;
    const userId = authResult.user.id;
    const db = dbManager.getDatabase();

    // Get message with sender information
    const messageRow = db.prepare(`
      SELECT m.*, 
             u.username as sender_username,
             u.current_rank as sender_rank
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = ? AND (m.recipient_id = ? OR m.sender_id = ?)
    `).get(messageId, userId, userId);

    if (!messageRow) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const message = {
      ...dbManager.rowToMessage(messageRow),
      sender_username: messageRow.sender_username,
      sender_rank: messageRow.sender_rank
    };

    // Mark message as read if user is the recipient
    if (message.recipient_id === userId && message.status === 'delivered') {
      // Update last_active to track message reading
      db.prepare(`
        UPDATE users 
        SET last_active = ?
        WHERE id = ?
      `).run(new Date().toISOString(), userId);
    }

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const messageId = params.id;
    const userId = authResult.user.id;
    const body = await request.json();
    const { action } = body;

    const db = dbManager.getDatabase();

    // Verify user has access to this message
    const messageRow = db.prepare(`
      SELECT * FROM messages 
      WHERE id = ? AND (recipient_id = ? OR sender_id = ?)
    `).get(messageId, userId, userId);

    if (!messageRow) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (action === 'mark_read' && messageRow.recipient_id === userId) {
      // Mark message as read by updating user's last_active
      db.prepare(`
        UPDATE users 
        SET last_active = ?
        WHERE id = ?
      `).run(new Date().toISOString(), userId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}