'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppBar, Toolbar, Button, Typography, Box } from '@mui/material';
import { useEffect, useState } from 'react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/facebook-connect', label: 'Connect Facebook Page' },
  { href: '/posts', label: 'Page Posts' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    setHasToken(!!token);
  }, [pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Mocking Bird
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {navLinks.map(({ href, label }) => (
            <Button
              key={href}
              component={Link}
              href={href}
              color={pathname === href ? 'secondary' : 'inherit'}
              variant={pathname === href ? 'contained' : 'text'}
              sx={{
                color: 'white',
                fontWeight: pathname === href ? 'bold' : 'normal',
              }}
            >
              {label}
            </Button>
          ))}

          {!hasToken && (
            <>
              <Button
                component={Link}
                href="/login"
                color={pathname === '/login' ? 'secondary' : 'inherit'}
                variant={pathname === '/login' ? 'contained' : 'text'}
                sx={{ color: 'white', fontWeight: pathname === '/login' ? 'bold' : 'normal' }}
              >
                Login
              </Button>

              <Button
                component={Link}
                href="/register"
                color={pathname === '/register' ? 'secondary' : 'inherit'}
                variant={pathname === '/register' ? 'contained' : 'text'}
                sx={{ color: 'white', fontWeight: pathname === '/register' ? 'bold' : 'normal' }}
              >
                Register
              </Button>
            </>
          )}

          {hasToken && (
            <Button
              onClick={handleLogout}
              color="inherit"
              variant="text"
              sx={{ color: 'white', fontWeight: 'normal' }}
            >
              Logout
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
