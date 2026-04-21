'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useState, useCallback } from 'react';
import { useAuth } from '../app/hooks/AuthProvider';

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

const getNavLinks = (isLoggedIn: boolean): NavLink[] =>
  isLoggedIn
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
        { href: '/publish', label: 'Publish', icon: EditNoteOutlinedIcon },
        { href: '/history', label: 'History', icon: HistoryOutlinedIcon },
        { href: '/analytics', label: 'Analytics', icon: BarChartOutlinedIcon },
        { href: '/ai', label: 'AI Tools', icon: AutoAwesomeOutlinedIcon },
        { href: '/about', label: 'About', icon: InfoOutlinedIcon },
      ]
    : [
        { href: '/', label: 'Home', icon: DashboardOutlinedIcon },
        { href: '/about', label: 'About', icon: InfoOutlinedIcon },
      ];

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Mockingbird"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.24, flexShrink: 0 }}
    />
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { isLoggedIn, logout } = useAuth();

  const handleDrawerToggle = useCallback(
    () => setDrawerOpen((prev) => !prev),
    []
  );

  const handleLogout = useCallback(async () => {
    if (isMobile) setDrawerOpen(false);
    await logout();
  }, [isMobile, logout]);

  const currentNavLinks = getNavLinks(isLoggedIn);

  const drawer = (
    <Box
      sx={{
        width: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
      role="presentation"
    >
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LogoMark size={38} />
          <Typography
            sx={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Mocking<span style={{ fontStyle: 'italic', fontWeight: 400 }}>bird</span>
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <List sx={{ flex: 1, py: 1 }}>
        {currentNavLinks.map((item) => (
          <ListItem key={item.href} disablePadding sx={{ px: 1 }}>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              onClick={handleDrawerToggle}
              sx={{
                borderRadius: 2,
                mx: 0.5,
                my: 0.25,
                gap: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '& .nav-icon': { color: 'primary.main' },
                },
              }}
            >
              <item.icon
                className="nav-icon"
                sx={{
                  fontSize: 18,
                  color: pathname === item.href ? 'primary.main' : 'text.secondary',
                }}
              />
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: pathname === item.href ? 600 : 500,
                  color: pathname === item.href ? 'text.primary' : 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {!isLoggedIn ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              component={Link}
              href="/auth"
              onClick={handleDrawerToggle}
              variant="outlined"
              fullWidth
              size="small"
            >
              Sign in
            </Button>
          </Box>
        ) : (
          <Button
            onClick={handleLogout}
            variant="text"
            fullWidth
            startIcon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              justifyContent: 'flex-start',
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
                bgcolor: 'error.light',
              },
            }}
          >
            Logout
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          px: { xs: 2, md: 4 },
          py: 0.5,
          minHeight: { xs: 56, md: 60 },
        }}
      >
        {/* Logo + Nav */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 4 } }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LogoMark size={38} />
              <Typography
                sx={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'text.primary',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                Mocking<span style={{ fontStyle: 'italic', fontWeight: 400 }}>bird</span>
              </Typography>
            </Box>
          </Link>

          {/* Desktop Nav */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 0.25,
            }}
          >
            {currentNavLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  startIcon={
                    <item.icon
                      sx={{
                        fontSize: '15px !important',
                        color: isActive ? 'primary.main' : 'text.secondary',
                      }}
                    />
                  }
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: isActive ? 'text.primary' : 'text.secondary',
                    bgcolor: isActive ? 'action.selected' : 'transparent',
                    letterSpacing: '-0.01em',
                    minWidth: 'auto',
                    '&:hover': {
                      bgcolor: isActive ? 'action.selected' : 'action.hover',
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Desktop auth */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            {!isLoggedIn ? (
              <Button
                component={Link}
                href="/auth"
                size="small"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8125rem',
                }}
              >
                Sign in
              </Button>
            ) : (
              <Button
                onClick={handleLogout}
                size="small"
                startIcon={<LogoutOutlinedIcon sx={{ fontSize: 15 }} />}
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8125rem',
                  '&:hover': {
                    color: 'error.main',
                  },
                }}
              >
                Logout
              </Button>
            )}
          </Box>

          {/* Mobile menu button */}
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              display: { xs: 'flex', md: 'none' },
              width: 38,
              height: 38,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            borderRadius: '16px 0 0 16px',
            border: 'none',
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
