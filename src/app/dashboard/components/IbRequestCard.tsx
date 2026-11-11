"use client";

import { useState } from "react";
import { BadgeCheck, Clock, Network, Send, ShieldCheck, XCircle } from "lucide-react";
import { useCreateIbRequest, useIbRequestStatus } from "@/hooks/useReferral";
import { Toast } from "@/app/components/ui/Toast";

/**
 * Shown on the client dashboard when the user was referred by an IB
 * but does not have IB dashboard access yet. Lets them request access;
 * the referrer approves from IB dashboard -> Sub-IB Requests.
 */
export default function IbRequestCard() {
  const { data, isLoading } = useIbRequestStatus();
  const createRequest = useCreateIbRequest();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  if (isLoading || !data) return null;

  // Already has IB access -> nothing to show here
  if (data.ibDashboardEnabled) return null;

  // Not referred by anyone -> nothing to request from
  const ib = data.referredBy;
  if (!ib) return null;

  const request = data.request;
  const status = String(request?.status || "").toUpperCase();
  const isPending = status === "PENDING";
  const isApproved = status === "APPROVED";
  const isRejected = status === "REJECTED";

  const handleRequest = async () => {
    try {
      await createRequest.mutateAsync("");
      setToast({ message: `Request sent to ${ib.name || "your IB"}`, type: "success" });
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
                ? `Request pending with ${ib.name || "your IB"} — you will get IB dashboard access once approved.`
                : isApproved
                  ? "Your IB access is approved — open your IB dashboard now."
                  : isRejected
                    ? `Request rejected${request?.rejectionReason ? `: ${request.rejectionReason}` : ""}. You can request again.`
                    : `You were referred by ${ib.name || "an IB"}. Request IB dashboard access to manage your own referral network.`}
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
            ? "Your referrer will review and approve your request from their IB dashboard."
            : isApproved
              ? "IB dashboard access is now enabled on your account."
              : "Your request was rejected — you cannot submit another IB request."}
        </p>
      ) : null}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </section>
  );
}
