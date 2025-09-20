import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth';
import { AuthUser } from '@/types';

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

/**
 * Middleware to authenticate API requests
 */
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, message: 'Authorization token required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const user = authService.verifyToken(token);

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Add user to request object
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return handler(authenticatedRequest);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Extract user from authenticated request
 */
export function getAuthenticatedUser(request: AuthenticatedRequest): AuthUser {
  if (!request.user) {
    throw new Error('User not found in authenticated request');
  }
  return request.user;
}

/**
 * Authenticate a request and return user info
 */
export async function authMiddleware(request: NextRequest): Promise<{ success: boolean; user?: AuthUser }> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false };
    }

    const token = authHeader.substring(7);
    const user = authService.verifyToken(token);

    if (!user) {
      return { success: false };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { success: false };
  }
}