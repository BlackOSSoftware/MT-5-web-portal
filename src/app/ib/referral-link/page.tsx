"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Check,
  Link2,
  UserPlus,
  Clock,
  Users,
  HandCoins,
  Wallet,
  Share2,
  Inbox,
} from "lucide-react";
import { useReferralSummary, useSubIbRequests, useMySubIbRequest } from "@/hooks/useReferral";
import { Toast } from "@/app/components/ui/Toast";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  statusTone,
  btnPrimary,
  IbPageShell,
} from "../components/ui";

export default function ReferralLinkPage() {
  const { data: summary, isLoading } = useReferralSummary();
  const { data: requestsData } = useSubIbRequests("", 1, 20);
  const { data: myRequest } = useMySubIbRequest();

  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const code = summary?.referralCode || "";
  const link = useMemo(() => {
    if (!code || typeof window === "undefined") return "";
    return `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;
  }, [code]);

  const requests = requestsData?.items ?? [];

  const copy = async (text: string, kind: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setToast({ message: "Copy failed", type: "error" });
    }
  };

  const share = async () => {
    if (!link) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join Oceana Profx", url: link });
      } else {
        await copy(link, "link");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <IbPageShell
      tips={[
        "Copy your link and share it on social media.",
        "Every signup with your link counts as a referral.",
        "Check Sub-IB requests regularly and respond fast.",
        "Your referral code also works on the register page.",
      ]}
    >
      <PageHeader
        icon={Link2}
        title="Referral Link"
        subtitle="Share your referral link and track Sub-IB requests."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total Referrals"
          value={String(summary?.totalReferrals ?? 0)}
          tone="primary"
        />
        <StatCard
          icon={HandCoins}
          label="Total Earned"
          value={`$${Number(summary?.totalEarned || 0).toLocaleString()}`}
          tone="green"
        />
        <StatCard
          icon={Wallet}
          label="Referral Balance"
          value={`$${Number(summary?.referralBalance || 0).toLocaleString()}`}
          tone="blue"
        />
      </div>

      {/* Link card */}
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-[var(--primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-main)]">Your Referral Link</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={link}
            className="flex-1 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy(link, "link")}
              className={`${btnPrimary} flex-1 sm:flex-none`}
            >
              {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
              {copied === "link" ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-4 py-2.5 text-sm font-semibold text-[var(--text-main)] transition hover:border-[var(--primary)]/40"
            >
              <Share2 size={15} />
              Share
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Referral code:</span>
          <code className="rounded-lg bg-[var(--bg-glass)] px-2.5 py-1 text-sm font-bold tracking-wide text-[var(--text-main)]">
            {code || "—"}
          </code>
          {code && (
            <button
              type="button"
              onClick={() => copy(code, "code")}
              className="text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              {copied === "code" ? "Copied" : "Copy code"}
            </button>
          )}
        </div>
      </Card>

      {/* My Sub-IB request status */}
      {myRequest && (
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">
            <UserPlus size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Your Sub-IB request to {myRequest.ib?.name || "your IB"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {myRequest.status}
              {myRequest.status === "REJECTED" && myRequest.rejectionReason
                ? ` — ${myRequest.rejectionReason}`
                : ""}
            </p>
          </div>
          <Badge tone={statusTone(myRequest.status)}>{myRequest.status}</Badge>
        </Card>
      )}

      {/* IB requests */}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border-soft)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-main)]">Sub-IB Requests</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Clients who asked to become your Sub-IB.
          </p>
        </div>
        {requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Sub-IB requests yet"
            subtitle="When clients request to become your Sub-IB, they will appear here."
          />
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {requests.map((req) => (
              <li key={req.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/12 text-sm font-bold text-[var(--primary)]">
                  {String(req.requester.name || "U").trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-main)]">
                    {req.requester.name}
                  </p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {req.requester.email}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-placeholder)]">
                  <Clock size={10} />
                  {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}
                </span>
                <Badge tone={statusTone(req.status)}>{req.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </IbPageShell>
  );
}
