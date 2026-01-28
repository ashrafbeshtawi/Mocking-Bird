'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, createContext, useContext } from 'react';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/about', '/auth', '/privacy', '/error', '/terms'];

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  userId: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner component that uses useSession
function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = status === 'loading';
  const isLoggedIn = !!session;

  // Redirect unauthenticated users from protected routes
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );

    if (!isLoggedIn && !isPublicRoute) {
      router.push('/auth');
    }
  }, [isLoggedIn, isLoading, pathname, router]);

  const logout = async () => {
    await signOut({ callbackUrl: '/auth' });
  };

  const value: AuthContextType = {
    isLoggedIn,
    isLoading,
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    logout,
  };

  // Show nothing while loading (prevents flash)
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Main provider that wraps with SessionProvider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

// Hook to access auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
