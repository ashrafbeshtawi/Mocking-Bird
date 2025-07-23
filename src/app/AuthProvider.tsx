'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import jwt from 'jsonwebtoken';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      if (pathname !== '/login' && pathname !== '/register') {
        router.push('/login');
      }
      return;
    }

    try {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string' || !decoded.exp) {
        sessionStorage.removeItem('token');
        if (pathname !== '/login' && pathname !== '/register') {
          router.push('/login');
        }
        return;
      }
      const isExpired = decoded.exp * 1000 < Date.now();
      if (isExpired) {
        sessionStorage.removeItem('token');
        if (pathname !== '/login' && pathname !== '/register') {
          router.push('/login');
        }
      }
    } catch (error) {
      sessionStorage.removeItem('token');
      if (pathname !== '/login' && pathname !== '/register') {
        router.push('/login');
      }
    }
  }, [pathname, router]);

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

  if (!token && pathname !== '/login' && pathname !== '/register') {
    return null;
  }

  return <>{children}</>;
}
