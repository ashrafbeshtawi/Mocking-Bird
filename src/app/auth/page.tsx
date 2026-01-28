"use client"

import { signIn } from "next-auth/react"
import { Box, Button, Container, Paper, Typography, Stack, Divider } from "@mui/material"
import GoogleIcon from "@mui/icons-material/Google"
import GitHubIcon from "@mui/icons-material/GitHub"
import Link from "next/link"

// Discord icon (MUI doesn't have one built-in)
function DiscordIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

export default function AuthPage() {
  const handleSignIn = (provider: string) => {
    signIn(provider, { callbackUrl: "/dashboard" })
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Logo/Title */}
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Mocking Bird
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to continue
          </Typography>

          {/* OAuth Buttons */}
          <Stack spacing={2} sx={{ width: "100%", maxWidth: 320 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={() => handleSignIn("google")}
              sx={{
                bgcolor: "#4285f4",
                "&:hover": { bgcolor: "#3367d6" },
                textTransform: "none",
                py: 1.5,
              }}
            >
              Continue with Google
            </Button>

            <Button
              variant="contained"
              size="large"
              startIcon={<GitHubIcon />}
              onClick={() => handleSignIn("github")}
              sx={{
                bgcolor: "#24292e",
                "&:hover": { bgcolor: "#1b1f23" },
                textTransform: "none",
                py: 1.5,
              }}
            >
              Continue with GitHub
            </Button>

            <Button
              variant="contained"
              size="large"
              startIcon={<DiscordIcon />}
              onClick={() => handleSignIn("discord")}
              sx={{
                bgcolor: "#5865F2",
                "&:hover": { bgcolor: "#4752c4" },
                textTransform: "none",
                py: 1.5,
              }}
            >
              Continue with Discord
            </Button>
          </Stack>

          {/* Terms */}
          <Divider sx={{ width: "100%", my: 3 }} />
          <Typography variant="caption" color="text.secondary" align="center">
            By continuing, you agree to our{" "}
            <Link href="/terms" style={{ color: "inherit" }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: "inherit" }}>
              Privacy Policy
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
