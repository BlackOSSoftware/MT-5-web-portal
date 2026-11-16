import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Oceanaprofx Trading Platform",
  description:
    "Create your free Oceanaprofx account — trade demo & live markets with real-time charts, low spreads, instant deposits and withdrawals, and earn with the IB referral program.",
  alternates: { canonical: "/signup" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Sign Up | Oceanaprofx Trading Platform",
    description:
      "Join Oceanaprofx — free trading account with real-time charts, demo & live trading, and IB referral earnings.",
    url: "https://user.oceanaprofx.com/signup",
    type: "website",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Server-rendered SEO content — visible to crawlers, hidden from users */}
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        <h1>Create your Oceanaprofx trading account</h1>
        <p>
          Sign up for Oceanaprofx to access demo and live trading accounts,
          real-time candlestick charts, multiple deposit and withdrawal methods,
          KYC verification and the IB referral dashboard. Start trading in
          minutes with a free account.
        </p>
      </div>
      {children}
    </>
  );
}
