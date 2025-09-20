import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import { HonkMessage } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const status = searchParams.get('status'); // 'flying' | 'delivered' | null (all)
    const search = searchParams.get('search'); // Search in title/content

    const offset = (page - 1) * limit;
    const userId = authResult.user.id;

    const db = dbManager.getDatabase();

    // Build WHERE clause
    let whereClause = 'WHERE recipient_id = ?';
    const params: any[] = [userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Validate sort column
    const validSortColumns = ['created_at', 'delivered_at', 'title'];
    const validSortOrders = ['asc', 'desc'];
    
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM messages 
      ${whereClause}
    `;
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult?.total || 0;

    // Get messages with pagination
    const messagesQuery = `
      SELECT m.*, u.username as sender_username
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      ${whereClause}
      ORDER BY ${finalSortBy} ${finalSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const messageRows = db.prepare(messagesQuery).all(...params, limit, offset);

    // Transform rows to HonkMessage objects
    const messages: (HonkMessage & { sender_username?: string })[] = messageRows.map((row: any) => ({
      ...dbManager.rowToMessage(row),
      sender_username: row.sender_username
    }));

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}