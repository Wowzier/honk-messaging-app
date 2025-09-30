'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { AuthUser, LoginCredentials, RegisterCredentials, AuthResponse, UserProfile } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  generateLinkCode: () => Promise<{ code: string; expiresIn: number } | null>;
  linkDevice: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_COOKIE_NAME = 'honk_auth_token';
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform
    };
  };

  const initializeAuth = async () => {
    try {
      const token = Cookies.get(TOKEN_COOKIE_NAME);
      if (token) {
        // Try to verify existing token
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            setLoading(false);
            return;
          }
        }
        
        // Token is invalid, remove it
        Cookies.remove(TOKEN_COOKIE_NAME);
      }

      // No valid token, try seamless device authentication
      try {
        const deviceInfo = getDeviceInfo();
        const response = await fetch('/api/auth/device', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(deviceInfo),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user && data.token) {
            setUser(data.user);
            Cookies.set(TOKEN_COOKIE_NAME, data.token, COOKIE_OPTIONS);
          }
        }
      } catch (deviceAuthError) {
        console.error('Device auth error:', deviceAuthError);
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      Cookies.remove(TOKEN_COOKIE_NAME);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.user && data.token) {
        setUser(data.user);
        Cookies.set(TOKEN_COOKIE_NAME, data.token, COOKIE_OPTIONS);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.user && data.token) {
        setUser(data.user);
        Cookies.set(TOKEN_COOKIE_NAME, data.token, COOKIE_OPTIONS);
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  };

  const logout = () => {
    setUser(null);
    Cookies.remove(TOKEN_COOKIE_NAME);
  };

  const updateProfile = async (profile: Partial<UserProfile>): Promise<boolean> => {
    try {
      const token = Cookies.get(TOKEN_COOKIE_NAME);
      if (!token) {
        return false;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  };

  const refreshUser = async () => {
    try {
      const token = Cookies.get(TOKEN_COOKIE_NAME);
      if (!token) {
        return;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('User refresh error:', error);
    }
  };

  const generateLinkCode = async (): Promise<{ code: string; expiresIn: number } | null> => {
    try {
      const token = Cookies.get(TOKEN_COOKIE_NAME);
      if (!token) {
        return null;
      }

      const response = await fetch('/api/auth/generate-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return { code: data.code, expiresIn: data.expiresIn };
        }
      }

      return null;
    } catch (error) {
      console.error('Generate link code error:', error);
      return null;
    }
  };

  const linkDevice = async (code: string): Promise<boolean> => {
    try {
      const deviceInfo = getDeviceInfo();
      const response = await fetch('/api/auth/link-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, ...deviceInfo }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user && data.token) {
          setUser(data.user);
          Cookies.set(TOKEN_COOKIE_NAME, data.token, COOKIE_OPTIONS);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Link device error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    generateLinkCode,
    linkDevice,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}