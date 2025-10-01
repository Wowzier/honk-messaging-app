import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth';
import { AuthUser } from '@/types';

const TOKEN_COOKIE_NAME = 'honk_auth_token';

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieToken = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Middleware to authenticate API requests
 */
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(request);
      if (!token) {
        return NextResponse.json(
          { success: false, message: 'Courier session token required' },
          { status: 401 }
        );
      }

      const user = authService.verifyToken(token);

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired courier session' },
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
    const token = extractToken(request);
    if (!token) {
      return { success: false };
    }

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
