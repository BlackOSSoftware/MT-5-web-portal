"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  LayoutDashboard,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCreateIbRequest, useIbRequestStatus } from "@/hooks/useReferral";
import { Toast } from "@/app/components/ui/Toast";

/**
 * Shown on the client dashboard when the user does not have IB dashboard
 * access yet. Referred clients send the request to their referrer (IB);
 * direct signups send it to the admin team. Either way admin can review it.
 */
export default function IbRequestCard() {
  const { data, isLoading } = useIbRequestStatus();
  const createRequest = useCreateIbRequest();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  if (isLoading || !data) return null;

  const ib = data.referredBy;
  const reviewerName = ib?.name || "the admin team";

  // IB access already enabled -> show partner dashboard card
  if (data.ibDashboardEnabled) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-[var(--primary)]/25 bg-gradient-to-br from-[var(--primary)]/[0.08] via-[var(--bg-card)] to-[var(--bg-card)] p-5 shadow-[0_0_40px_-12px_var(--primary-glow)] md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/30">
                <Sparkles size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--text-main)] md:text-lg">
                    IB Partner Active
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                    <BadgeCheck size={11} />
                    Approved
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)] md:text-sm">
                  Your IB dashboard is live — manage your referral network, track
                  commissions and grow your earnings.
                </p>
              </div>
            </div>
            <Link
              href="/ib"
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] px-5 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/25 transition hover:brightness-110"
            >
              <LayoutDashboard size={16} />
              Open IB Dashboard
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: <Users size={14} />, label: "Referral Network", value: "Live" },
              { icon: <Wallet size={14} />, label: "IB Commissions", value: "Track" },
              { icon: <TrendingUp size={14} />, label: "Earnings", value: "Real-time" },
              { icon: <Network size={14} />, label: "Sub-IBs", value: "Manage" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]/70 px-3 py-2.5 backdrop-blur"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/12 text-[var(--primary)]">
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {f.label}
                  </p>
                  <p className="text-xs font-semibold text-[var(--text-main)]">
                    {f.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const request = data.request;
  const status = String(request?.status || "").toUpperCase();
  const isPending = status === "PENDING";
  const isApproved = status === "APPROVED";
  const isRejected = status === "REJECTED";

  const handleRequest = async () => {
    try {
      await createRequest.mutateAsync("");
      setToast({
        message: ib
          ? `Request sent to ${ib.name || "your IB"}`
          : "Request sent to the admin team",
        type: "success",
      });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || "Failed to send request",
        type: "error",
      });
    }
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-3 shadow-sm md:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,var(--primary-glow),transparent_55%)] opacity-50" />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)] ring-1 ring-[var(--primary)]/20">
            <Network size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-main)]">
              Become an IB Partner
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {isPending
                ? `Request pending with ${reviewerName} — you will get IB dashboard access once approved.`
                : isApproved
                  ? "Your IB access is approved — open your IB dashboard now."
                  : isRejected
                    ? `Request rejected${request?.rejectionReason ? `: ${request.rejectionReason}` : ""}. You can request again.`
                    : ib
                      ? `You were referred by ${ib.name || "an IB"}. Request IB dashboard access to manage your own referral network.`
                      : "Request IB dashboard access to become an IB partner and earn commissions on your referrals."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/12 px-3 py-2 text-xs font-semibold text-blue-500">
              <Clock size={14} />
              Pending Approval
            </span>
          ) : isApproved ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-500">
              <BadgeCheck size={14} />
              Approved
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/12 px-3 py-2 text-xs font-semibold text-red-500">
              <XCircle size={14} />
              Rejected
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRequest}
              disabled={createRequest.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              <Send size={14} />
              {createRequest.isPending ? "Sending..." : "Request IB Access"}
            </button>
          )}
        </div>
      </div>

      {isPending || isRejected || isApproved ? (
        <p className="relative z-10 mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <ShieldCheck size={12} className="text-[var(--primary)]" />
          {isPending
            ? ib
              ? "Your referrer will review and approve your request from their IB dashboard."
              : "The admin team will review and approve your request."
            : isApproved
              ? "IB dashboard access is now enabled on your account."
              : "Your request was rejected — you cannot submit another IB request."}
        </p>
      ) : null}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </section>
  );
}
