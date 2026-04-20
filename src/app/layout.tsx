
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Fraunces, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "./hooks/AuthProvider";
import MuiThemeProvider from "./ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mockingbird",
  description: "Write once. Land everywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${instrumentSerif.variable} antialiased`}>
        <AuthProvider>
          <MuiThemeProvider>
            <Navbar />
            {children}
          </MuiThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
