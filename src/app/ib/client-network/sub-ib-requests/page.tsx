"use client";

import { useState } from "react";
import { Check, X, UserPlus, Clock, Inbox, ShieldCheck } from "lucide-react";
import {
  useSubIbRequests,
  useMySubIbRequest,
  useCreateSubIbRequest,
  useRespondSubIbRequest,
} from "@/hooks/useReferral";
import { Toast } from "@/app/components/ui/Toast";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import {
  PageHeader,
  Card,
  Badge,
  EmptyState,
  statusTone,
  inputCls,
  btnPrimary,
  btnGhost,
  IbPageShell,
} from "../../components/ui";

const STATUS_FILTERS = ["", "PENDING", "APPROVED", "REJECTED"] as const;

export default function SubIbRequestsPage() {
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useSubIbRequests(status, page, 50);
  const { data: myRequest } = useMySubIbRequest();
  const createRequest = useCreateSubIbRequest();
  const respond = useRespondSubIbRequest();

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const handleApprove = async (id: string) => {
    try {
      await respond.mutateAsync({ requestId: id, action: "APPROVE" });
      setToast({ message: "Sub-IB request approved", type: "success" });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || "Action failed", type: "error" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await respond.mutateAsync({ requestId: id, action: "REJECT", reason: rejectReason });
      setRejectingId(null);
      setRejectReason("");
      setToast({ message: "Sub-IB request rejected", type: "success" });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || "Action failed", type: "error" });
    }
  };

  const handleBecomeSubIb = async () => {
    try {
      await createRequest.mutateAsync("");
      setToast({ message: "Sub-IB request sent to your IB", type: "success" });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || "Request failed", type: "error" });
    }
  };

  return (
    <IbPageShell
      tips={[
        "Approve only clients you trust as your Sub-IB.",
        "Approved Sub-IBs get their own IB dashboard.",
        "You can reject a request with a reason.",
        "Check the request notes before making a decision.",
      ]}
    >
      <PageHeader
        icon={UserPlus}
        title="Sub-IB Requests"
        subtitle="Clients asking to become your Sub-IB, and your own Sub-IB request status."
        action={
          myRequest ? (
            <Badge tone={statusTone(myRequest.status)}>
              Your request: {myRequest.status}
            </Badge>
          ) : (
            <button
              type="button"
              onClick={handleBecomeSubIb}
              disabled={createRequest.isPending}
              className={btnPrimary}
            >
              <UserPlus size={14} />
              {createRequest.isPending ? "Sending..." : "Become a Sub-IB"}
            </button>
          )
        }
      />

      {/* My request detail */}
      {myRequest && (
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">
            <ShieldCheck size={18} />
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              status === s
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Sub-IB requests"
            subtitle="When clients ask to become your Sub-IB, their requests will appear here."
          />
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {items.map((req) => (
              <li key={req.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/12 text-sm font-bold text-[var(--primary)]">
                    {String(req.requester.name || "U").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-semibold text-[var(--text-main)]">
                      {req.requester.name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-secondary)]">
                      {req.requester.email}
                    </p>
                    {req.note ? (
                      <p className="mt-0.5 truncate text-xs italic text-[var(--text-placeholder)]">
                        “{req.note}”
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-placeholder)]">
                      <Clock size={10} />
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}
                    </span>
                    <Badge tone={statusTone(req.status)}>{req.status}</Badge>
                  </div>
                  {req.status === "PENDING" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApprove(req.id)}
                        disabled={respond.isPending}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/12 px-2.5 py-1.5 text-xs font-bold text-emerald-500 transition hover:bg-emerald-500/22 disabled:opacity-50"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(rejectingId === req.id ? null : req.id)}
                        className="flex items-center gap-1 rounded-lg bg-red-500/12 px-2.5 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/22"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>

                {rejectingId === req.id && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[var(--bg-glass)] p-3 sm:flex-row">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason (optional)"
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => handleReject(req.id)}
                      disabled={respond.isPending}
                      className={`${btnGhost} border-red-500/30 text-red-500 hover:border-red-500/60`}
                    >
                      Confirm Reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} requests
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={btnGhost}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={btnGhost}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </IbPageShell>
  );
}
