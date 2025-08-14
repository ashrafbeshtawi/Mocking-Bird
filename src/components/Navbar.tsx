'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useCallback } from 'react';
import { useAuth } from '../app/hooks/AuthProvider';

const getNavLinks = (isLoggedIn: boolean) =>
  isLoggedIn
    ? [
        { href: '/', label: 'Home' },
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/publish', label: 'Publish' },
        { href: '/about', label: 'About' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' }
      ];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const handleDrawerToggle = useCallback(
    () => setDrawerOpen((prev) => !prev),
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      // Standard: Call API to clear server-side cookie
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Logout failed');

      // Update client auth state
      setIsLoggedIn(false);

      // Redirect to login
      router.push('/login');

      // Close mobile drawer if open
      if (isMobile) setDrawerOpen(false);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }, [router, isMobile, setIsLoggedIn]);

  const currentNavLinks = getNavLinks(isLoggedIn);

  const drawer = (
    <Box
      onClick={handleDrawerToggle}
      sx={{
        width: 250,
        bgcolor: theme.palette.background.paper,
        height: '100%',
        color: theme.palette.text.primary
      }}
      role="presentation"
    >
      <List>
        {currentNavLinks.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              sx={{
                color:
                  pathname === item.href
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                bgcolor:
                  pathname === item.href
                    ? theme.palette.action.selected
                    : 'inherit',
                '&:hover': { bgcolor: theme.palette.action.hover }
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}

        {!isLoggedIn ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/login"
                selected={pathname === '/login'}
              >
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/register"
                selected={pathname === '/register'}
              >
                <ListItemText primary="Register" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{ color: theme.palette.error.main }}
            >
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: theme.shadows[1],
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', padding: 2 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Typography variant="h6">
            <span className="bird-icon">🐦</span> Mockingbird
          </Typography>
        </Link>

        {/* Desktop Links */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            gap: 2,
            alignItems: 'center'
          }}
        >
          {currentNavLinks.map(({ href, label }) => (
            <Button
              key={href}
              component={Link}
              href={href}
              sx={{
                color:
                  pathname === href
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                fontWeight:
                  pathname === href
                    ? theme.typography.fontWeightBold
                    : theme.typography.fontWeightRegular,
                textTransform: 'none'
              }}
            >
              {label}
            </Button>
          ))}

          {!isLoggedIn ? (
            <>
              <Button
                component={Link}
                href="/login"
                sx={{ textTransform: 'none' }}
              >
                Login
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                color="secondary"
                sx={{ textTransform: 'none' }}
              >
                Register
              </Button>
            </>
          ) : (
            <Button
              onClick={handleLogout}
              variant="outlined"
              color="primary"
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          )}
        </Box>

        {/* Mobile Menu Button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton color="inherit" edge="end" onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
