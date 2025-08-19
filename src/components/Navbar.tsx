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
  useTheme,
  SvgIcon,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useCallback } from 'react';
import { useAuth } from '../app/hooks/AuthProvider';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoIcon from '@mui/icons-material/Info';

const getNavLinks = (isLoggedIn: boolean) =>
  isLoggedIn
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { href: '/publish', label: 'Publish', icon: RocketLaunchIcon },
        { href: '/publish-history', label: 'History', icon: HistoryIcon },
        { href: '/ai', label: 'AI Prompts', icon: AutoAwesomeIcon },
        { href: '/about', label: 'About', icon: InfoIcon },
      ]
    : [
        { href: '/', label: 'Home', icon: HomeIcon },
        { href: '/about', label: 'About', icon: InfoIcon }
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
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Logout failed');

      setIsLoggedIn(false);
      router.push('/login');

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
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: theme.typography.fontWeightBold,
                  backgroundColor: theme.palette.action.selected,
                },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <item.icon sx={{ mr: 2, color: pathname === item.href ? theme.palette.primary.main : theme.palette.text.secondary }} />
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <Divider />
        {!isLoggedIn ? (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/login">
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/register">
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
      elevation={0}
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Typography variant="h5" fontWeight={800} color="primary">
            🐦 Mockingbird
          </Typography>
        </Link>

        {/* Desktop Links */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 4,
          }}
        >
          {currentNavLinks.map(({ href, label, icon: IconComponent }) => (
            <Button
              key={href}
              component={Link}
              href={href}
              startIcon={<IconComponent />}
              sx={{
                color: pathname === href
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
                fontWeight: pathname === href ? 700 : 400,
                textTransform: 'none',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -8,
                  left: 0,
                  width: '100%',
                  height: '2px',
                  backgroundColor: pathname === href ? theme.palette.primary.main : 'transparent',
                  transition: 'background-color 0.3s ease',
                },
                
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
                disableElevation
                sx={{ textTransform: 'none' }}
              >
                Get Started
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