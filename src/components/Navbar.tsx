'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppBar, Toolbar, Button, Typography, Box } from '@mui/material';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Facebook Login' },
  { href: '/posts', label: 'Page Posts' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}> {/* Using primary color from theme */}
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Mocking Bird
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {navLinks.map(({ href, label }) => (
            <Button
              key={href}
              component={Link} // Use Link from next/link for routing
              href={href}
              color={pathname === href ? 'secondary' : 'inherit'} // Highlight active link with secondary color
              variant={pathname === href ? 'contained' : 'text'} // Use contained for active, text for inactive
              sx={{
                color: pathname === href ? 'white' : 'white', // Ensure text is white
                fontWeight: pathname === href ? 'bold' : 'normal',
              }}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
