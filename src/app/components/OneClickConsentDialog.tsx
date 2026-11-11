"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Zap } from "lucide-react";
import {
  ONE_CLICK_CONSENT_EVENT,
  confirmOneClickTrading,
} from "@/lib/oneClickTrading";

/**
 * First-time one-click trading consent. Any `setEnabled(true)` call before the
 * user has agreed dispatches ONE_CLICK_CONSENT_EVENT; this dialog then asks for
 * consent. Agreeing enables one-click trading permanently (per browser).
 */
export default function OneClickConsentDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onRequest = () => setOpen(true);
    window.addEventListener(ONE_CLICK_CONSENT_EVENT, onRequest);
    return () => window.removeEventListener(ONE_CLICK_CONSENT_EVENT, onRequest);
  }, []);

  if (!open || typeof document === "undefined") return null;

  const agree = () => {
    confirmOneClickTrading();
    setOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl bg-[var(--bg-card)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
            <Zap size={18} />
          </span>
          <h3 className="text-[16px] font-bold text-[var(--text-main)]">
            Activate One-Click Trading
          </h3>
        </div>

        <p className="mb-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          One-Click Trading lets you execute trades with a single click, without
          any additional confirmations. Your order will be submitted immediately
          when you:
        </p>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <li>Click the Sell or Buy buttons on the One-Click trading panel</li>
          <li>Click Place Sell Order or Place Buy Order on the Trade panel</li>
          <li>Set or modify orders directly on the chart</li>
          <li>Close or delete orders in the Positions module or directly from the chart</li>
        </ul>
        <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          By clicking <span className="font-semibold text-[var(--text-main)]">Agree and continue</span>,
          you consent to the Terms and Conditions for activating One-Click
          Trading. You can turn it off anytime from settings.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[14px] font-semibold text-[var(--text-main)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={agree}
            className="h-11 rounded-xl bg-[var(--primary)] text-[14px] font-semibold text-white"
          >
            Agree and continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
