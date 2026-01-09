'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | number | null;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/', '/about', '/login', '/register', '/privacy', '/error'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check authentication status via API
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include', // Important: send cookies
      });

      const data = await response.json();

      if (data.authenticated) {
        setIsLoggedIn(true);
        setUserId(data.userId);
      } else {
        setIsLoggedIn(false);
        setUserId(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsLoggedIn(false);
      setUserId(null);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggedIn(false);
      setUserId(null);
      router.push('/login');
    }
  }, [router]);

  // Check auth on mount and pathname change
  useEffect(() => {
    const performAuthCheck = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };

    performAuthCheck();
  }, [checkAuth]);

  // Redirect unauthenticated users from protected routes
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!isLoggedIn && !isPublicRoute) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, pathname, router]);

  // Show nothing while loading (or could show a spinner)
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, userId, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
