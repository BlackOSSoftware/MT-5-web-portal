import type { Metadata } from "next";
import HomeIntro from "./components/HomeIntro";

export const metadata: Metadata = {
  title: "Oceanaprofx — Advanced Trading Platform",
  description:
    "Trade demo & live markets on Oceanaprofx — real-time charts, instant deposits & withdrawals, KYC verification and IB referral earnings. Create your free account today.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Oceanaprofx — Advanced Trading Platform",
    description:
      "Demo & live trading accounts, real-time charts, deposits, withdrawals and IB referral program.",
    url: "https://user.oceanaprofx.com",
    type: "website",
  },
};

export default function Home() {
  return (
    <>
      {/* Server-rendered SEO content — visible to crawlers, hidden from users */}
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        <h1>Oceanaprofx — Advanced Trading Platform</h1>
        <p>
          Oceanaprofx offers demo and live trading accounts with real-time
          candlestick charts, multiple deposit and withdrawal methods, KYC
          verification and an IB referral program. Create a free account and
          start trading in minutes.
        </p>
      </div>
      <HomeIntro />
    </>
  );
}
