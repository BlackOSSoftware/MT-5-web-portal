import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import FcmRegister from "./components/FcmRegister";
import PresenceTracker from "./components/PresenceTracker";
import InitNotifications from "./components/InitNotifications";
import { Roboto } from "next/font/google";
import SWRegister from "./sw-register";
import ChunkErrorBoundary from "./components/ChunkErrorBoundary";
import BackHandler from "./components/BackHandler";
import CapacitorStatusBar from "./components/CapacitorStatusBar";
import PushRegister from "./components/PushRegister";
import NetworkStatusGuard from "./components/NetworkStatusGuard";

const mtFont = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://user.oceanaprofx.com"),
  title: "Oceanaprofx",
  description: "Advanced Trading Platform by Oceanaprofx",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/oceanaprofx-logo.png?v=oceanaprofx-20261028", type: "image/png", sizes: "1024x1024" }],
    shortcut: ["/oceanaprofx-logo.png?v=oceanaprofx-20261028"],
    apple: [{ url: "/oceanaprofx-logo.png?v=oceanaprofx-20261028", type: "image/png", sizes: "1024x1024" }],
  },
  openGraph: {
    title: "Oceanaprofx",
    description: "Advanced Trading Platform by Oceanaprofx",
    url: "https://user.oceanaprofx.com",
    siteName: "Oceanaprofx",
    type: "website",
    images: [
      {
        url: "/oceanaprofx-logo.png?v=oceanaprofx-20261028",
        width: 1024,
        height: 1024,
        alt: "Oceanaprofx logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oceanaprofx",
    description: "Advanced Trading Platform by Oceanaprofx",
    images: ["/oceanaprofx-logo.png?v=oceanaprofx-20261028"],
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

      <head className={mtFont.className}>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/oceanaprofx-logo.png?v=oceanaprofx-20261028" type="image/png" />

        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Oceanaprofx" />
        <link rel="apple-touch-icon" href="/oceanaprofx-logo.png?v=oceanaprofx-20261028" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />


        <link rel="apple-touch-icon" href="/oceanaprofx-logo.png?v=oceanaprofx-20261028" />
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

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mt-font`}
      >
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
          {children}</AppProviders>
      </body>
    </html>
  );
}
