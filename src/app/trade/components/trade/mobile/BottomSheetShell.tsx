"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Mobile action sheet with the drag handle + title row used across the Trade tab. */
export default function BottomSheetShell({
  open,
  title,
  subtitle,
  right,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-end bg-black/40 md:items-center md:justify-center md:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--bg-card)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5 animate-slideUp md:max-w-md md:rounded-2xl md:pb-4 md:pt-4 md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border-strong)] md:hidden" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold text-[var(--text-main)]">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 font-mono text-[12px] text-[var(--text-muted)]">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {right}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-glass)] text-[var(--text-main)]"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
