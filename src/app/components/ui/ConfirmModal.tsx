"use client";

import { createPortal } from "react-dom";

export default function ConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div
        className="w-[90%] max-w-sm rounded-xl bg-[var(--bg-card)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm bg-[var(--bg-glass)]"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={onConfirm}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white"
          >
            {loading ? "Creating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
