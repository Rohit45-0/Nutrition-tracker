import type { Metadata, Viewport } from "next";
import { Anek_Latin, Fraunces } from "next/font/google";
import "./globals.css";

const anek = Anek_Latin({
  subsets: ["latin"],
  variable: "--font-anek",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NutriTrack - Indian Diet Tracker",
  description:
    "Track calories, protein, water, and Indian meals with a fast mobile-first nutrition journal.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#eef7f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anek.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
