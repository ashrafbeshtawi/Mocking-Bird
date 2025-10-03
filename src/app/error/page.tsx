"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Box, Typography, Button } from "@mui/material";
import Link from "next/link";

interface ErrorDetails {
  title: string;
  description: string;
}

const getErrorDetails = (statusCode: number): ErrorDetails => {
  switch (statusCode) {
    case 400:
      return {
        title: "Bad Request",
        description: "The server cannot process the request due to a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).",
      };
    case 401:
      return {
        title: "Unauthorized",
        description: "Authentication is required and has failed or has not yet been provided. Please log in again or check your credentials.",
      };
    case 403:
      return {
        title: "Forbidden",
        description: "You do not have permission to access this resource. This might be due to insufficient privileges or a restricted area.",
      };
    case 404:
      return {
        title: "Page Not Found",
        description: "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Please check the URL or go back to the homepage.",
      };
    case 500:
      return {
        title: "Internal Server Error",
        description: "Something went wrong on our end. We're working to fix it. Please try again later.",
      };
    case 502:
      return {
        title: "Bad Gateway",
        description: "The server, while acting as a gateway or proxy, received an invalid response from an upstream server. This is usually a temporary issue.",
      };
    case 503:
      return {
        title: "Service Unavailable",
        description: "The server is currently unable to handle the request due to a temporary overload or scheduled maintenance, which will likely be alleviated after some delay. Please try again in a few moments.",
      };
    default:
      return {
        title: "An Unexpected Error Occurred",
        description: "We encountered an unexpected issue. Please try refreshing the page or contact support if the problem persists.",
      };
  }
};

const ErrorPage: React.FC = () => {
  const searchParams = useSearchParams();
  const statusCode = Number(searchParams.get("statusCode")) || 500;
  const customMessage = searchParams.get("message");

  const { title, description } = getErrorDetails(statusCode);
  const displayMessage = customMessage || description;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        p: 4,
        textAlign: "center",
      }}
    >
      <Typography variant="h1" component="h1" sx={{ fontSize: { xs: "4rem", sm: "6rem" }, fontWeight: "bold", mb: 2 }}>
        {statusCode}
      </Typography>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ maxWidth: 600, mb: 4 }}>
        {displayMessage}
      </Typography>
      <Button component={Link} href="/" variant="contained" color="primary">
        Go to Homepage
      </Button>
    </Box>
  );
};

export default ErrorPage;
