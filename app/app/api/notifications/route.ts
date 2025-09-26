import { NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { NotificationRecord } from '@/types';

export async function POST(request: Request) {
  try {
    const notification = await request.json();
    const db = dbManager.getDatabase();
    
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      notification.id,
      notification.user_id,
      notification.type,
      notification.title,
      notification.body,
      notification.metadata ? JSON.stringify(notification.metadata) : null,
      notification.created_at
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error persisting notification:', error);
    return NextResponse.json({ error: 'Failed to persist notification' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = dbManager.getDatabase();
    const rows = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all(userId);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error loading notifications:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { notificationId, readAt } = await request.json();
    const db = dbManager.getDatabase();
    
    db.prepare(`
      UPDATE notifications 
      SET read_at = ? 
      WHERE id = ?
    `).run(readAt, notificationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}