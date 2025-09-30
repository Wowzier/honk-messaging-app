import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user!;
    const db = dbManager.getDatabase();
    
    // Get all users except the current user
    const stmt = db.prepare(`
      SELECT id, username, created_at
      FROM users
      WHERE id != ?
      ORDER BY username ASC
    `);
    
    const users = stmt.all(user.id);

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
