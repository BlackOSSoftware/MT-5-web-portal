"use client";

import { Info } from "lucide-react";

export default function TipBanner({
  title = "Tip",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      className="
        relative overflow-hidden rounded-xl
        border border-[var(--border-soft)]
        bg-[var(--bg-glass)]
        max-w-2xl
        p-4
      "
    >
      {/* subtle brand glow */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full"
        style={{
          background: "var(--primary-glow)",
          filter: "blur(48px)",
          opacity: 0.6,
        }}
      />

      <div className="relative flex items-start gap-3">
        {/* ICON */}
        <div
          className="
            mt-0.5 flex h-8 w-8 items-center justify-center
            rounded-full
          "
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border-soft)",
            color: "var(--primary)",
          }}
        >
          <Info size={16} />
        </div>

        {/* TEXT */}
        <div>
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {title}
          </div>

          <p
            className="mt-1 text-sm leading-relaxed"
            style={{ color: "var(--text-main)" }}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
