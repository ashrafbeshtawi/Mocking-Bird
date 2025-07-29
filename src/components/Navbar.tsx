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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useEffect, useState, useCallback } from 'react';

// Define navigation links based on login status
const getNavLinks = (isLoggedIn : boolean) => {
  if (isLoggedIn) {
    return [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About' },
      { href: '/dashboard', label: 'Dashboard' },
    ];
  } else {
    return [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About' },
    ];
  }
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Check for token on component mount and path changes
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    setHasToken(!!token);
  }, [pathname]);

  // Handle mobile drawer toggle
  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  // Handle user logout
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('token');
    setHasToken(false);
    router.push('/login');
    if (isMobile) setDrawerOpen(false);
  }, [router, isMobile]);

  // Get dynamic navigation links based on token presence
  const currentNavLinks = getNavLinks(hasToken);

  // Drawer content for mobile
  const drawer = (
    <Box
      onClick={handleDrawerToggle}
      sx={{
        width: 250,
        bgcolor: theme.palette.background.paper,
        height: '100%',
        color: theme.palette.text.primary,
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
                color: pathname === item.href ? theme.palette.primary.main : theme.palette.text.primary,
                bgcolor: pathname === item.href ? theme.palette.action.selected : 'inherit',
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        {/* Conditional Auth Buttons in Drawer */}
        {!hasToken ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/login"
                selected={pathname === '/login'}
                sx={{
                  color: pathname === '/login' ? theme.palette.primary.main : theme.palette.text.primary,
                  bgcolor: pathname === '/login' ? theme.palette.action.selected : 'inherit',
                }}
              >
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/register"
                selected={pathname === '/register'}
                sx={{
                  color: pathname === '/register' ? theme.palette.secondary.main : theme.palette.text.primary,
                  bgcolor: pathname === '/register' ? theme.palette.action.selected : 'inherit',
                }}
              >
                <ListItemText primary="Register" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout} sx={{ color: theme.palette.error.main }}>
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
        borderBottom: `1px solid ${theme.palette.divider}`,
        transition: 'background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', padding: 2 }}>
        {/* Brand/Logo */}
        <Link href="/" passHref style={{ textDecoration: 'none' }}>
          <Typography
            variant="h6"
            component="div"
          >
            <Typography component="span" className="bird-icon">
              🐦
            </Typography>
            Mockingbird
          </Typography>
        </Link>

        {/* Navigation Links and Auth Buttons (Desktop) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
          {currentNavLinks.map(({ href, label }) => (
            <Button
              key={href}
              component={Link}
              href={href}
              sx={{
                color: pathname === href ? theme.palette.primary.main : theme.palette.text.secondary,
                fontWeight: pathname === href ? theme.typography.fontWeightBold : theme.typography.fontWeightRegular,
                textTransform: 'none',
                borderRadius: theme.shape.borderRadius,
                padding: theme.spacing(1, 2),
                transition: 'background-color 0.3s ease, color 0.3s ease',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  color: pathname === href ? theme.palette.primary.dark : theme.palette.text.primary,
                },
              }}
            >
              {label}
            </Button>
          ))}

          {/* Conditional Auth Buttons */}
          {!hasToken ? (
            <>
              <Button
                component={Link}
                href="/login"
                sx={{
                  color: pathname === '/login' ? theme.palette.primary.main : theme.palette.text.secondary,
                  fontWeight: pathname === '/login' ? theme.typography.fontWeightBold : theme.typography.fontWeightRegular,
                  textTransform: 'none',
                  borderRadius: theme.shape.borderRadius,
                  padding: theme.spacing(1, 2),
                  transition: 'background-color 0.3s ease, color 0.3s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    color: pathname === '/login' ? theme.palette.primary.dark : theme.palette.text.primary,
                  },
                }}
              >
                Login
              </Button>

              <Button
                component={Link}
                href="/register"
                variant="contained"
                color="secondary"
                sx={{ textTransform: 'none', borderRadius: theme.shape.borderRadius }}
              >
                Register
              </Button>
            </>
          ) : (
            <Button
              onClick={handleLogout}
              variant="outlined"
              color="primary"
              sx={{ textTransform: 'none', borderRadius: theme.shape.borderRadius }}
            >
              Logout
            </Button>
          )}
        </Box>

        {/* Mobile Menu Button (visible only on small screens) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="end"
            onClick={handleDrawerToggle}
            sx={{ color: theme.palette.text.primary }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>
      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}