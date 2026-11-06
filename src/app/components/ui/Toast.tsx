"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  onClose?: () => void;
  /** How long the toast stays on screen (ms). */
  duration?: number;
};

const EXIT_MS = 150;

/** Centered premium toast used across the dashboard and trading terminal. */
export function Toast({ message, type = "success", onClose, duration = 700 }: ToastProps) {
  const isSuccess = type === "success";
  const [phase, setPhase] = useState<"enter" | "shown" | "leaving">("enter");
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const show = window.setTimeout(() => setPhase("shown"), 10);
    const leave = window.setTimeout(() => setPhase("leaving"), Math.max(duration - EXIT_MS, 0));
    const close = window.setTimeout(() => onCloseRef.current?.(), duration);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(leave);
      window.clearTimeout(close);
    };
  }, [message, type, duration]);

  const dismiss = () => {
    setPhase("leaving");
    window.setTimeout(() => onCloseRef.current?.(), EXIT_MS);
  };

  if (typeof document === "undefined") return null;

  const accent = isSuccess ? "var(--success)" : "var(--error)";
  const visible = phase === "shown";

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        role={isSuccess ? "status" : "alert"}
        aria-live={isSuccess ? "polite" : "assertive"}
        className={`pointer-events-auto relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[0_24px_60px_-16px_rgba(15,23,42,0.45)] transition-all duration-150 ease-out ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: accent, opacity: 0.18 }}
        />
        <div className="relative flex items-start gap-3 px-4 py-4 sm:px-5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
          >
            {isSuccess ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-[var(--text-main)]">
              {isSuccess ? "Success" : "Something went wrong"}
            </p>
            <p className="mt-0.5 break-words text-[13px] leading-relaxed text-[var(--text-secondary)]">{message}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
          >
            <X size={15} />
          </button>
        </div>
        <span className="block h-[3px] w-full bg-[var(--bg-glass)]">
          <span
            className="toast-progress block h-full"
            style={{ background: accent, animationDuration: `${duration}ms` }}
          />
        </span>
      </div>
    </div>,
    document.body,
  );
}
