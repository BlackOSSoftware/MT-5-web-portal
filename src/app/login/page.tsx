import { Suspense } from "react";
import type { Metadata } from "next";
import LoginPage from "../components/Login/Login";

export const metadata: Metadata = {
  title: "Login | Oceanaprofx Trading Platform",
  description:
    "Login to Oceanaprofx — advanced trading platform with real-time charts, demo & live accounts, deposits, withdrawals and IB referral dashboard.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Login | Oceanaprofx Trading Platform",
    description:
      "Access your Oceanaprofx trading account — real-time charts, demo & live trading, wallet and IB dashboard.",
    url: "https://user.oceanaprofx.com/login",
    type: "website",
  },
};

export default function Login() {
  return (
    <>
      {/* Server-rendered SEO content — visible to crawlers, hidden from users */}
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        <h1>Login to Oceanaprofx Trading Platform</h1>
        <p>
          Sign in to your Oceanaprofx account to access real-time trading charts,
          demo and live trading accounts, wallet deposits and withdrawals,
          KYC verification and the IB referral dashboard.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    </>
  );
}
