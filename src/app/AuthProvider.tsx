'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import jwt from 'jsonwebtoken';

const PUBLIC_ROUTES = ['/', '/about', '/login', '/register'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!token && !isPublicRoute) {
      router.push('/login');
      return;
    }

    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (!decoded || typeof decoded === 'string' || !decoded.exp) {
          sessionStorage.removeItem('token');
          if (!isPublicRoute) {
            router.push('/login');
          }
          return;
        }

        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          sessionStorage.removeItem('token');
          if (!isPublicRoute) {
            router.push('/login');
          }
        }
      } catch (error) {
        sessionStorage.removeItem('token');
        if (!isPublicRoute) {
          router.push('/login');
        }
      }
    }
  }, [pathname, router]);

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!token && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
