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
  metadataBase: new URL("https://user.fptrades.com"),
  title: "FPTrade",
  description: "Advanced Trading Platform by FPTrade",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/fp-logo.png?v=fptrades-20261026", type: "image/png", sizes: "1024x1024" }],
    shortcut: ["/fp-logo.png?v=fptrades-20261026"],
    apple: [{ url: "/fp-logo.png?v=fptrades-20261026", type: "image/png", sizes: "1024x1024" }],
  },
  openGraph: {
    title: "FPTrade",
    description: "Advanced Trading Platform by FPTrade",
    url: "https://user.fptrades.com",
    siteName: "FPTrade",
    type: "website",
    images: [
      {
        url: "/fp-logo.png?v=fptrades-20261026",
        width: 1024,
        height: 1024,
        alt: "FPTrade logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FPTrade",
    description: "Advanced Trading Platform by FPTrade",
    images: ["/fp-logo.png?v=fptrades-20261026"],
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
        <link rel="icon" href="/fp-logo.png?v=fptrades-20261026" type="image/png" />

        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FPTrade" />
        <link rel="apple-touch-icon" href="/fp-logo.png?v=fptrades-20261026" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />


        <link rel="apple-touch-icon" href="/fp-logo.png?v=fptrades-20261026" />
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
