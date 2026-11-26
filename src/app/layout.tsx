import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "./providers";
import FcmRegister from "./components/FcmRegister";
import PresenceTracker from "./components/PresenceTracker";
import InitNotifications from "./components/InitNotifications";
import ChunkErrorBoundary from "./components/ChunkErrorBoundary";
import BackHandler from "./components/BackHandler";
import CapacitorStatusBar from "./components/CapacitorStatusBar";
import NetworkStatusGuard from "./components/NetworkStatusGuard";
import OneClickConsentDialog from "./components/OneClickConsentDialog";

/**
 * Avoid next/font/google here: Next 15.5 + Turbopack breaks when Google serves
 * extensionless `/l/font?kit=...` URLs ("queries have exactly one entry").
 * Fonts load via <link> in <head> instead.
 */

export const metadata: Metadata = {
  metadataBase: new URL("https://user.oceanaprofx.com"),
  title: {
    default: "Oceanaprofx — Advanced Trading Platform",
    template: "%s | Oceanaprofx",
  },
  description:
    "Oceanaprofx is an advanced trading platform offering demo & live trading accounts, real-time charts, deposits, withdrawals, KYC verification and an IB referral program.",
  keywords: [
    "Oceanaprofx",
    "trading platform",
    "forex trading",
    "demo trading account",
    "live trading account",
    "real-time charts",
    "IB referral program",
    "online trading",
  ],
  category: "finance",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  authors: [{ name: "Oceanaprofx" }],
  creator: "Oceanaprofx",
  publisher: "Oceanaprofx",
  icons: {
    icon: [{ url: "/oceanaprofx-icon.png?v=emblem-20261114", type: "image/png", sizes: "512x512" }],
    shortcut: ["/oceanaprofx-icon.png?v=emblem-20261114"],
    apple: [{ url: "/oceanaprofx-icon.png?v=emblem-20261114", type: "image/png", sizes: "512x512" }],
  },
  openGraph: {
    title: "Oceanaprofx — Advanced Trading Platform",
    description:
      "Demo & live trading accounts, real-time charts, deposits, withdrawals and IB referral program.",
    url: "https://user.oceanaprofx.com",
    siteName: "Oceanaprofx",
    type: "website",
    images: [
      {
        url: "/oceanaprofx-logo.png?v=wave-20261114",
        width: 1024,
        height: 1024,
        alt: "Oceanaprofx logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oceanaprofx — Advanced Trading Platform",
    description:
      "Demo & live trading accounts, real-time charts, deposits, withdrawals and IB referral program.",
    images: ["/oceanaprofx-logo.png?v=wave-20261114"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <html lang="en" suppressHydrationWarning>
      {/* <link rel="manifest" href="/manifest.json" /> */}
      {/* <link rel="apple-touch-icon" href="/apple-touch-icon.png" /> */}
      {/* <meta name="apple-mobile-web-app-capable" content="yes" /> */}
      {/* <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" /> */}

      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/oceanaprofx-icon.png?v=emblem-20261114" type="image/png" />

        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Oceanaprofx" />
        <link rel="apple-touch-icon" href="/oceanaprofx-icon.png?v=emblem-20261114" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        {/* Structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "Oceanaprofx",
                  url: "https://user.oceanaprofx.com",
                  logo: "https://user.oceanaprofx.com/oceanaprofx-logo.png?v=wave-20261114",
                  description:
                    "Advanced trading platform with demo & live accounts, real-time charts and IB referral program.",
                },
                {
                  "@type": "WebSite",
                  name: "Oceanaprofx",
                  url: "https://user.oceanaprofx.com",
                  publisher: { "@type": "Organization", name: "Oceanaprofx" },
                },
              ],
            }),
          }}
        />
        {/* 🔥 THEME INIT SCRIPT (RUNS BEFORE REACT) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
            `,
          }}
        />
      </head>

      <body className="antialiased mt-font">
        <AppProviders>
        <NetworkStatusGuard />
        <CapacitorStatusBar />
        {/* <PushRegister /> */}
        <BackHandler />
        {/* <SWRegister /> */}
          <ChunkErrorBoundary/>
          <FcmRegister />
          <PresenceTracker />
          <InitNotifications />
          <OneClickConsentDialog />
          {children}</AppProviders>
      </body>
    </html>
  );
}
