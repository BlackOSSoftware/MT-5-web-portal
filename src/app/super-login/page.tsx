"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { tradeLogin } from "@/services/tradeAuth.service";
import {
  getTradeLandingRoute,
  storeActiveTradeSession,
} from "@/lib/tradeSession";

/**
 * Hidden super-admin entry: any trading account number + platform super
 * password opens a full TRADE session on the web portal. Not linked anywhere.
 */
export default function SuperLoginPage() {
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !password) {
      setError("Account number and password are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await tradeLogin({
        account_number: accountNumber.trim(),
        password,
      });
      if (!session?.tradeToken) throw new Error("No trade session returned");
      storeActiveTradeSession({
        tradeToken: session.tradeToken,
        sessionType: session.sessionType,
        accountId: session.accountId,
      });
      window.location.replace(getTradeLandingRoute());
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        e2?.response?.data?.message ||
          e2?.message ||
          "Invalid account number or password"
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-main)]">
            Account Access
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Enter trading account number and password
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border-soft)] bg-[var(--card-bg)] p-6 shadow-sm"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Account Number
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
              placeholder="e.g. 10001234"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
              Password
            </span>
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Opening…" : "Open Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
