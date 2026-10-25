"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

export default function Select({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: any) => {
      if (!ref.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <p className="text-xs mb-2 text-[var(--text-muted)]">
          {label}
        </p>
      )}

      {/* BUTTON */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          w-full flex items-center justify-between
          rounded-xl border border-[var(--border-soft)]
          bg-[var(--bg-card)]
          px-4 py-3 text-sm
          hover:bg-[var(--bg-glass)]
          transition
        "
      >
        <span className="truncate">
          {selected?.label || "Select option"}
        </span>
        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* DESKTOP DROPDOWN */}
      <div
        className={`
          absolute left-0 right-0 mt-2 z-50 top-14
          rounded-xl border border-[var(--border-soft)]
          bg-[var(--bg-card)]
          shadow-xl
          overflow-hidden
          transition-all duration-200
          ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}
        `}
      >
        <div className="max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const active = opt.value === value;

            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="
                  w-full flex items-center justify-between
                  px-4 py-3 text-sm
                  hover:bg-[var(--bg-glass)]
                  transition
                "
              >
                <span className="truncate">
                  {opt.label}
                </span>

                {active && (
                  <Check
                    size={16}
                    className="text-[var(--primary)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
