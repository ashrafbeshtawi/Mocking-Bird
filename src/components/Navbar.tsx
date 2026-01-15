'use client';

import Link from 'next/link';
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
  SvgIcon,
  Divider,
  Menu,
  MenuItem,
  Collapse,
  Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useCallback } from 'react';
import { useAuth } from '../app/hooks/AuthProvider';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface NavLink {
  href?: string;
  label: string;
  icon?: typeof SvgIcon;
  children?: { href: string; label: string; icon?: typeof SvgIcon }[];
}

const getNavLinks = (isLoggedIn: boolean): NavLink[] =>
  isLoggedIn
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { href: '/publish', label: 'Publish', icon: RocketLaunchIcon },
        { href: '/history', label: 'History', icon: HistoryIcon },
        {
          label: 'AI Tools',
          icon: AutoAwesomeIcon,
          children: [
            { href: '/ai/openai-config', label: 'OpenAI Config', icon: SettingsIcon },
            { href: '/ai/prompts', label: 'AI Prompts', icon: ChatIcon },
          ],
        },
        { href: '/about', label: 'About', icon: InfoIcon },
      ]
    : [
        { href: '/', label: 'Home', icon: HomeIcon },
        { href: '/about', label: 'About', icon: InfoIcon },
      ];

export default function Navbar() {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const { isLoggedIn, logout } = useAuth();

  const handleSubMenuClick = useCallback((label: string) => {
    setOpenSubMenu((prev) => (prev === label ? null : label));
  }, []);

  const handleDrawerToggle = useCallback(
    () => setDrawerOpen((prev) => !prev),
    []
  );

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleMenuMouseEnter = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuMouseLeave = useCallback(() => {
    setAnchorEl(null);
  }, []);

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
      {/* Drawer Header */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <RocketLaunchIcon sx={{ color: 'white', fontSize: 22 }} />
          </Avatar>
          <Typography variant="h6" fontWeight={700} sx={{ color: 'white' }}>
            Mockingbird
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Navigation Links */}
      <List sx={{ flex: 1, py: 2 }}>
        {currentNavLinks.map((item) =>
          item.href ? (
            <ListItem key={item.href} disablePadding sx={{ px: 1 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={pathname === item.href}
                onClick={handleDrawerToggle}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
                  '&.Mui-selected': {
                    background: 'linear-gradient(90deg, #1877f215, #E1306C15)',
                    '&:hover': {
                      background: 'linear-gradient(90deg, #1877f225, #E1306C25)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {item.icon && (
                  <item.icon
                    sx={{
                      mr: 2,
                      fontSize: 22,
                      color: pathname === item.href ? '#E1306C' : 'text.secondary',
                    }}
                  />
                )}
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: pathname === item.href ? 600 : 400,
                    color: pathname === item.href ? 'text.primary' : 'text.secondary',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ) : (
            <Box key={item.label}>
              <ListItem disablePadding sx={{ px: 1 }}>
                <ListItemButton
                  onClick={() => handleSubMenuClick(item.label)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                  }}
                >
                  {item.icon && (
                    <item.icon sx={{ mr: 2, fontSize: 22, color: 'text.secondary' }} />
                  )}
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ color: 'text.secondary' }}
                  />
                  {openSubMenu === item.label ? (
                    <ExpandLess sx={{ color: 'text.secondary' }} />
                  ) : (
                    <ExpandMore sx={{ color: 'text.secondary' }} />
                  )}
                </ListItemButton>
              </ListItem>
              <Collapse in={openSubMenu === item.label} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  {item.children?.map((child) => (
                    <ListItem key={child.href} disablePadding sx={{ px: 1 }}>
                      <ListItemButton
                        component={Link}
                        href={child.href}
                        selected={pathname === child.href}
                        onClick={handleDrawerToggle}
                        sx={{
                          borderRadius: 2,
                          mx: 1,
                          my: 0.5,
                          '&.Mui-selected': {
                            background: 'linear-gradient(90deg, #1877f215, #E1306C15)',
                          },
                        }}
                      >
                        {child.icon && (
                          <child.icon
                            sx={{
                              mr: 2,
                              fontSize: 20,
                              color: pathname === child.href ? '#E1306C' : 'text.secondary',
                            }}
                          />
                        )}
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{
                            fontSize: '0.9rem',
                            fontWeight: pathname === child.href ? 600 : 400,
                            color: pathname === child.href ? 'text.primary' : 'text.secondary',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          )
        )}
      </List>

      {/* Auth Section */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {!isLoggedIn ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              component={Link}
              href="/login"
              onClick={handleDrawerToggle}
              variant="outlined"
              fullWidth
              startIcon={<LoginIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                py: 1.2,
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: '#1877f2',
                  bgcolor: '#1877f210',
                },
              }}
            >
              Login
            </Button>
            <Button
              component={Link}
              href="/register"
              onClick={handleDrawerToggle}
              variant="contained"
              fullWidth
              startIcon={<PersonAddIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                py: 1.2,
                background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 50%, #d96830 100%)',
                },
              }}
            >
              Get Started
            </Button>
          </Box>
        ) : (
          <Button
            onClick={handleLogout}
            variant="outlined"
            fullWidth
            startIcon={<LogoutIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              py: 1.2,
              borderColor: '#ef444450',
              color: '#ef4444',
              '&:hover': {
                borderColor: '#ef4444',
                bgcolor: '#ef444410',
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
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          px: { xs: 2, md: 4 },
          py: 1,
          minHeight: { xs: 64, md: 72 },
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(225,48,108,0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(225,48,108,0.4)',
                },
              }}
            >
              <RocketLaunchIcon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(90deg, #1877f2, #E1306C, #F77737)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Mockingbird
            </Typography>
          </Box>
        </Link>

        {/* Desktop Links */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
          }}
        >
          {currentNavLinks.map((item) =>
            item.href ? (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                startIcon={item.icon && <item.icon sx={{ fontSize: 18 }} />}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  color: pathname === item.href ? '#E1306C' : 'text.secondary',
                  fontWeight: pathname === item.href ? 600 : 500,
                  textTransform: 'none',
                  bgcolor: pathname === item.href ? '#E1306C10' : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: pathname === item.href ? '#E1306C15' : 'action.hover',
                  },
                }}
              >
                {item.label}
              </Button>
            ) : (
              <Box
                key={item.label}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
              >
                <Button
                  startIcon={item.icon && <item.icon sx={{ fontSize: 18 }} />}
                  endIcon={
                    <KeyboardArrowDownIcon
                      sx={{
                        fontSize: 18,
                        transition: 'transform 0.2s',
                        transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'rotate(0)',
                      }}
                    />
                  }
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    color: item.children?.some((child) => pathname === child.href)
                      ? '#E1306C'
                      : 'text.secondary',
                    fontWeight: item.children?.some((child) => pathname === child.href) ? 600 : 500,
                    textTransform: 'none',
                    bgcolor: item.children?.some((child) => pathname === child.href)
                      ? '#E1306C10'
                      : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  {item.label}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  MenuListProps={{
                    onMouseLeave: handleMenuMouseLeave,
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  sx={{
                    '& .MuiPaper-root': {
                      mt: 1,
                      minWidth: 220,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      overflow: 'hidden',
                    },
                  }}
                >
                  {item.children?.map((child) => (
                    <MenuItem
                      key={child.href}
                      component={Link}
                      href={child.href}
                      onClick={handleMenuClose}
                      selected={pathname === child.href}
                      sx={{
                        py: 1.5,
                        px: 2.5,
                        gap: 2,
                        '&.Mui-selected': {
                          background: 'linear-gradient(90deg, #1877f215, #E1306C15)',
                          '&:hover': {
                            background: 'linear-gradient(90deg, #1877f225, #E1306C25)',
                          },
                        },
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {child.icon && (
                        <child.icon
                          sx={{
                            fontSize: 20,
                            color: pathname === child.href ? '#E1306C' : 'text.secondary',
                          }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: pathname === child.href ? 600 : 400,
                          color: pathname === child.href ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {child.label}
                      </Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )
          )}

          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5 }} />

          {!isLoggedIn ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                component={Link}
                href="/login"
                sx={{
                  px: 2.5,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                Login
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                disableElevation
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  background: 'linear-gradient(90deg, #1877f2 0%, #E1306C 50%, #F77737 100%)',
                  boxShadow: '0 4px 12px rgba(225,48,108,0.3)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #155eaf 0%, #c02a5c 50%, #d96830 100%)',
                    boxShadow: '0 6px 16px rgba(225,48,108,0.4)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Get Started
              </Button>
            </Box>
          ) : (
            <Button
              onClick={handleLogout}
              variant="outlined"
              startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                borderColor: 'divider',
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  bgcolor: '#ef444410',
                },
              }}
            >
              Logout
            </Button>
          )}
        </Box>

        {/* Mobile Menu Button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              color: 'text.primary',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#E1306C',
                bgcolor: '#E1306C10',
              },
            }}
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
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            borderRadius: '16px 0 0 16px',
            boxShadow: '-8px 0 30px rgba(0,0,0,0.1)',
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
