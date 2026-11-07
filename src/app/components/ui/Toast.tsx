"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  onClose?: () => void;
  /** How long the toast stays on screen (ms). Defaults to a reading time based on the message length. */
  duration?: number;
};

const EXIT_MS = 140;

/** Enough time to read: ~2.5s for short messages, up to 6s for long ones (errors get a bit more). */
function readingTime(message: string, isError: boolean) {
  const base = 2500 + String(message || "").length * 45 + (isError ? 800 : 0);
  return Math.min(Math.max(base, 2500), 6000);
}

/** Premium toast (top-right on desktop, top of the screen on mobile) used across the portal. */
export function Toast({ message, type = "success", onClose, duration: durationProp }: ToastProps) {
  const isSuccess = type === "success";
  const duration = durationProp ?? readingTime(message, !isSuccess);
  const [phase, setPhase] = useState<"enter" | "shown" | "leaving">("enter");
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Two frames: let the hidden state paint once so the quick slide-in actually animates.
    let show = window.requestAnimationFrame(() => {
      show = window.requestAnimationFrame(() => setPhase("shown"));
    });
    const leave = window.setTimeout(() => setPhase("leaving"), Math.max(duration - EXIT_MS, 0));
    const close = window.setTimeout(() => onCloseRef.current?.(), duration);
    return () => {
      window.cancelAnimationFrame(show);
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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1000] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:inset-x-auto sm:right-0 sm:justify-end sm:px-5 sm:pt-5">
      <div
        role={isSuccess ? "status" : "alert"}
        aria-live={isSuccess ? "polite" : "assertive"}
        className={`relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[0_24px_60px_-16px_rgba(15,23,42,0.45)] transition-all duration-[120ms] ease-out sm:w-[380px] ${
          visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
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
