"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  HelpCircle,
  Mail,
  MessageCircleCodeIcon,
  Send,
  Ticket,
  XCircle,
} from "lucide-react";
import Select from "@/app/components/ui/Select";
import TipBanner from "@/app/components/ui/TipBanner";
import { useUserMe } from "@/hooks/useUser";
import { useCreateInquiry, useMyTickets } from "@/hooks/useInquiry";
import { Toast } from "@/app/components/ui/Toast";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import type { InquiryTicket } from "@/services/inquiry.service";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const row = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return row.response?.data?.message || row.message || "Failed to submit ticket.";
  }
  return "Failed to submit ticket.";
}

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status?: string }) {
  const s = String(status || "OPEN").toUpperCase();
  if (s === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--withdraw-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--withdraw-text)]">
        <XCircle size={11} />
        Closed
      </span>
    );
  }
  if (s === "REVIEWED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--deposit-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--deposit-text)]">
        <CheckCircle2 size={11} />
        Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--warning)]">
      <Clock3 size={11} />
      Open
    </span>
  );
}

export default function TicketPage() {
  const { data: user } = useUserMe();
  const createInquiry = useCreateInquiry();
  const { data: ticketsData, isLoading: ticketsLoading } = useMyTickets(1, 30);
  const [issue, setIssue] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const tickets = useMemo(
    () => (Array.isArray(ticketsData?.data) ? ticketsData.data : []),
    [ticketsData?.data],
  );

  const counts = useMemo(() => {
    const open = tickets.filter(
      (t) => String(t.status || "OPEN").toUpperCase() === "OPEN",
    ).length;
    const reviewed = tickets.filter(
      (t) => String(t.status).toUpperCase() === "REVIEWED",
    ).length;
    const closed = tickets.filter(
      (t) => String(t.status).toUpperCase() === "CLOSED",
    ).length;
    return { open, reviewed, closed, total: tickets.length };
  }, [tickets]);

  const handleSubmit = () => {
    if (!issue.trim()) {
      setToast({ message: "Please select issue type.", type: "error" });
      return;
    }

    if (!message.trim()) {
      setToast({ message: "Please enter issue description.", type: "error" });
      return;
    }

    if (!user?.name || !user?.email || !user?.phone) {
      setToast({
        message: "Profile data missing. Please update profile first.",
        type: "error",
      });
      return;
    }

    const titleMap: Record<string, string> = {
      deposit: "Deposit issue",
      withdraw: "Withdrawal issue",
      trading: "Trading issue",
      other: "Other issue",
    };

    createInquiry.mutate(
      {
        name: user.name,
        email: user.email,
        phone: user.phone,
        title: titleMap[issue] || "Support ticket",
        description: message.trim(),
        portalBrokerCode:
          process.env.NEXT_PUBLIC_BROKER_CODE || "OCEANAPROFX",
      },
      {
        onSuccess: (res: {
          data?: { ticketId?: string };
          message?: string;
        }) => {
          const ticketId = res?.data?.ticketId;
          setToast({
            message: ticketId
              ? `Ticket ${ticketId} submitted. Confirmation email sent.`
              : "Ticket submitted successfully. Confirmation email sent.",
            type: "success",
          });
          setMessage("");
          setIssue("");
        },
        onError: (error: unknown) => {
          setToast({ message: getErrorMessage(error), type: "error" });
        },
      },
    );
  };

  return (
    <div className="min-h-screen space-y-5 bg-[var(--bg-main)] p-2 md:space-y-8 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Raise a ticket and track review / close status from Oceanaprofx support.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        <div className="card flex items-start gap-3 p-3 transition hover:shadow-lg md:gap-4 md:p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
            <MessageCircleCodeIcon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Live Chat Support</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Coming Soon</p>
          </div>
        </div>

        <div className="card flex items-start gap-3 p-3 transition hover:shadow-lg md:gap-4 md:p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Mail size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Email Support</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              We usually respond within 24 hours.
            </p>
            <a
              href="mailto:info@oceanaprofx.com"
              className="mt-3 inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline"
            >
              info@oceanaprofx.com →
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="card h-full space-y-4 rounded-2xl p-3 md:space-y-6 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-glass)] text-[var(--primary)]">
                <Ticket size={20} />
              </div>
              <h2 className="text-lg font-semibold">Submit a Ticket</h2>
            </div>

            <Select
              label="Issue Type"
              value={issue}
              onChange={setIssue}
              options={[
                { label: "Deposit issue", value: "deposit" },
                { label: "Withdrawal issue", value: "withdraw" },
                { label: "Trading issue", value: "trading" },
                { label: "Other", value: "other" },
              ]}
            />

            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-none rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder="Explain your issue in detail..."
            />

            <button
              onClick={handleSubmit}
              disabled={createInquiry.isPending}
              className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-medium text-[var(--text-invert)] shadow-[0_10px_25px_var(--primary-glow)] transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {createInquiry.isPending ? (
                "Submitting..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send size={16} />
                  Submit Ticket
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-6">
          <TipBanner
            title="Before submitting"
            message="Select the correct issue type and include your account number in the message for faster resolution."
          />
          <TipBanner
            title="Confirmation email"
            message="After you submit, you will receive an automated Oceanaprofx email with your ticket ID. Please do not reply to that mail."
          />
          <TipBanner
            title="Ticket status"
            message="Open → Reviewed → Closed. You can track every ticket you raised in My Tickets below."
          />
          <div className="flex items-start gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)]">
            <HelpCircle size={14} className="mt-0.5 shrink-0" />
            Priority is given to withdrawal and trading issues.
          </div>
        </div>
      </div>

      {/* My tickets */}
      <section className="card space-y-4 rounded-2xl p-3 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">My Tickets</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Tickets you have issued, with live review status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-lg bg-[var(--bg-glass)] px-2.5 py-1">
              Total {counts.total}
            </span>
            <span className="rounded-lg bg-[var(--warning-bg)] px-2.5 py-1 text-[var(--warning)]">
              Open {counts.open}
            </span>
            <span className="rounded-lg bg-[var(--deposit-bg)] px-2.5 py-1 text-[var(--deposit-text)]">
              Reviewed {counts.reviewed}
            </span>
            <span className="rounded-lg bg-[var(--withdraw-bg)] px-2.5 py-1 text-[var(--withdraw-text)]">
              Closed {counts.closed}
            </span>
          </div>
        </div>

        {ticketsLoading ? (
          <div className="py-8">
            <GlobalLoader />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-main)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            You have not issued any tickets yet.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: InquiryTicket) => (
              <article
                key={ticket._id}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-3.5 md:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-bold text-[var(--primary)]">
                        {ticket.ticketId ||
                          `TKT-${String(ticket._id).slice(-8).toUpperCase()}`}
                      </p>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-[var(--text-main)]">
                      {ticket.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {formatWhen(ticket.createdAt)}
                  </p>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {ticket.description}
                </p>

                {ticket.adminNote ? (
                  <div className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Support note
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--text-main)]">
                      {ticket.adminNote}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
                  {ticket.reviewedAt ? (
                    <span>Reviewed {formatWhen(ticket.reviewedAt)}</span>
                  ) : null}
                  {ticket.closedAt ? (
                    <span>Closed {formatWhen(ticket.closedAt)}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
