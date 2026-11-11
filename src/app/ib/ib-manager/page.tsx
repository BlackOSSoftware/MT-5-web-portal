"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { Toast } from "@/app/components/ui/Toast";
import { useRespondSubIbRequest, useSubIbRequests } from "@/hooks/useReferral";
import type { SubIbRequest } from "@/services/referral.service";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  statusTone,
  IbPageShell,
} from "../components/ui";

type StatusFilter = "" | "PENDING" | "APPROVED" | "REJECTED";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function exportCsv(items: SubIbRequest[]) {
  const header = [
    "No",
    "Name",
    "Email",
    "Mobile Number",
    "Request Date",
    "Approved On",
    "Action By",
    "Status",
    "Remark",
  ];
  const rows = items.map((r, i) => [
    i + 1,
    r.requester?.name || "",
    r.requester?.email || "",
    r.requester?.phone || "",
    fmtDate(r.createdAt),
    fmtDate(r.respondedAt),
    r.respondedBy?.name || "",
    r.status,
    r.status === "REJECTED" ? r.rejectionReason || "" : r.note || "",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ib-manager-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function IbManagerPage() {
  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SubIbRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SubIbRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data, isLoading } = useSubIbRequests(status, page, 20);
  const respond = useRespondSubIbRequest();

  const items = data?.items ?? [];
  const counts = data?.statusCounts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  const pagination = data?.pagination;

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Declined" },
  ];

  const handleRespond = async (req: SubIbRequest, action: "APPROVE" | "REJECT") => {
    try {
      await respond.mutateAsync({
        requestId: req.id,
        action,
        reason: action === "REJECT" ? rejectReason : "",
      });
      setToast({
        message:
          action === "APPROVE"
            ? `${req.requester?.name || "User"} approved — IB dashboard access granted`
            : `${req.requester?.name || "User"}'s request declined`,
        type: "success",
      });
      setRejectTarget(null);
      setRejectReason("");
      setSelected(null);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || "Action failed",
        type: "error",
      });
    }
  };

  const pendingItems = useMemo(() => items.filter((r) => r.status === "PENDING"), [items]);

  return (
    <IbPageShell>
      <PageHeader
        icon={ShieldCheck}
        title="IB Manager"
        subtitle="Review and approve IB dashboard access requests from your referred users."
        action={
          <button
            type="button"
            onClick={() => exportCsv(items)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-3.5 text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-main)]"
          >
            <Download size={14} />
            Export
          </button>
        }
      />

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={BadgeCheck}
          label="Approved"
          value={String(counts.APPROVED)}
          hint="IB access granted"
          tone="green"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={String(counts.PENDING)}
          hint="Awaiting your action"
          tone="amber"
        />
        <StatCard
          icon={XCircle}
          label="Declined"
          value={String(counts.REJECTED)}
          hint="Requests rejected"
          tone="primary"
        />
      </div>

      {/* Pending alert */}
      {pendingItems.length > 0 && status !== "PENDING" ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          <Clock size={15} className="shrink-0" />
          <p>
            <span className="font-bold">{pendingItems.length}</span> pending IB request
            {pendingItems.length > 1 ? "s" : ""} need your approval — switch to the Pending
            tab to review.
          </p>
        </div>
      ) : null}

      {/* Table card */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-main)]">IB Approved Details</h2>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setStatus(f.key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                  status === f.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No requests found"
            subtitle="When your referred users request IB access, they will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">No.</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Mobile Number</th>
                  <th className="px-4 py-3 font-semibold">Request Date</th>
                  <th className="px-4 py-3 font-semibold">Approved On</th>
                  <th className="px-4 py-3 font-semibold">Action By</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Remark</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {items.map((r, idx) => (
                  <tr key={r.id} className="transition hover:bg-[var(--bg-glass)]/60">
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {(pagination?.page ?? 1 - 1) * (pagination?.limit ?? 20) + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-main)]">
                        {r.requester?.name || "User"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {r.requester?.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {r.requester?.phone || "--"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {fmtDate(r.respondedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {r.respondedBy?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {r.status === "REJECTED"
                        ? r.rejectionReason || "—"
                        : r.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRespond(r, "APPROVE")}
                              disabled={respond.isPending}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 text-[11px] font-bold text-emerald-500 transition hover:bg-emerald-500/25 disabled:opacity-50"
                            >
                              <UserCheck size={13} />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectTarget(r)}
                              disabled={respond.isPending}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-red-500/15 px-2.5 text-[11px] font-bold text-red-500 transition hover:bg-red-500/25 disabled:opacity-50"
                            >
                              <XCircle size={13} />
                              Decline
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} requests
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Detail modal */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-main)]">Request Details</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Name", selected.requester?.name],
                ["Email", selected.requester?.email],
                ["Mobile", selected.requester?.phone || "--"],
                ["Request Date", fmtDate(selected.createdAt)],
                ["Approved On", fmtDate(selected.respondedAt)],
                ["Action By", selected.respondedBy?.name || "—"],
                ["Status", selected.status],
                ["Note", selected.note || "—"],
                ...(selected.status === "REJECTED"
                  ? [["Rejection Reason", selected.rejectionReason || "—"]]
                  : []),
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-2 last:border-0"
                >
                  <span className="text-xs text-[var(--text-muted)]">{label}</span>
                  <span className="text-right text-xs font-semibold text-[var(--text-main)]">
                    {String(value ?? "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Reject modal */}
      {rejectTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[var(--text-main)]">Decline Request</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Decline IB access for {rejectTarget.requester?.name || "this user"}. They will not
              be able to request again.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
              className="mt-3 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-4 py-2.5 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-main)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRespond(rejectTarget, "REJECT")}
                disabled={respond.isPending}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {respond.isPending ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </IbPageShell>
  );
}
